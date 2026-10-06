# 后端注释规则

Node.js 后台的注释重点是业务边界、数据一致性和副作用。controller 注释说明请求参数、权限、租户、角色和提前返回的业务原因。service 注释说明编排顺序、事务边界、幂等设计、重试策略、缓存失效、软删除、状态流转和副作用顺序。

后台代码里的 `for` / `if` 通常直接承载业务边界。权限租户判断、状态流转分支、软删除过滤、事务内写入顺序、批量任务循环、外部接口失败分支和提前返回，默认都要补注释说明业务原因、数据口径或副作用边界；只有普通参数读取、简单空值 guard、没有业务含义的语法胶水可以不写。

| 后台位置                                | 优先解释                                                    | 不要解释                  |
| --------------------------------------- | ----------------------------------------------------------- | ------------------------- |
| controller                              | 权限、租户、角色、提前返回的业务原因                        | 普通取 query/body 参数    |
| service 编排                            | 顺序依赖、事务边界、幂等、重试、缓存失效、软删除            | 简单透传调用              |
| 权限 / 租户 / 状态分支                  | 分支原因、优先级、提前返回边界、状态不可逆规则              | 普通布尔条件翻译          |
| 批量循环 / 事务内循环                   | 每轮产出、去重口径、写入顺序、失败后是否可重试              | “遍历列表”                |
| SQL / Kysely                            | join 关系、group by 口径、时间范围、状态过滤、业务 key 映射 | 普通 where 条件逐句解释   |
| 定时任务 / 队列                         | 重入、去重、失败处理、补偿策略                              | “开始执行任务”“捕获异常”  |
| 外部接口 / webhook / 文件 / 支付 / 推送 | 字段映射、外部副作用、失败后的可恢复边界                    | 每个 try/catch 的表面含义 |

controller 里的权限、租户、角色、数据归属、状态不可操作判断，如果会提前返回或改变响应口径，要在分支上方说明业务边界。service 里的状态流转、软删除过滤、事务内分步写入、批量循环和外部副作用顺序，要说明为什么按这个顺序处理，以及失败后是否允许重试或补偿。

数据库查询、SQL、ORM query builder、聚合统计要给不直观的 join 关系、group by 口径、时间范围、状态过滤和业务 key 映射补注释。不要给普通 where 条件逐句解释。

通用 db / service 方法的 JSDoc 只写方法自身的查询范围、过滤条件和返回含义。不要写“供某某模板使用”“给某某页面使用”这类调用方场景，因为调用方会变化，这种注释会把通用能力绑死到某个业务入口。

```ts
/** 查询课堂下已关闭且未删除的签到记录。 */
static async dbGetClosedSignsByCourseId(courseId: number) {
  // ...
}
```

定时任务、队列消费、消息订阅、外部接口、webhook、文件上传、支付、消息推送，要说明重入、去重、失败处理、字段映射和补偿策略。错误处理和日志只写决策原因，不要给每个 `try/catch` 写“捕获异常”。

## 示例

```ts
/** 刷新课程答题统计，并返回本次任务产出的课程维度汇总。 */
export async function refreshCourseAnswerStats(courseId: number) {
  const course = await findCourseById(courseId);

  // 历史任务可能残留已删除课程，跳过脏数据即可，避免整批统计刷新被单条记录中断。
  if (!course) return emptyCourseAnswerStats;

  return database.transaction(async (transaction) => {
    // 同一个后台任务允许失败后重试，先清理本轮临时明细再写入，保证重复执行不会累计旧数据。
    await deleteTemporaryAnswerStats(courseId, transaction);
    await insertTemporaryAnswerStats(courseId, transaction);

    // 汇总结果只在事务末尾落库，避免接口读到明细已更新但汇总未更新的中间态。
    return updateCourseAnswerSummary(courseId, transaction);
  });
}
```

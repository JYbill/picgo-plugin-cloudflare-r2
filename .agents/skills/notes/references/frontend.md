# 前端注释规则

React 注释重点是用户可见状态、交互分支、副作用边界和父子状态同步。组件内的 `for` / `if`、提前 `return`、条件渲染、事件处理分支、异步回调 guard，只要影响展示优先级、用户可见结果、副作用顺序或状态同步边界，就按主规则补注释；只有普通 JSX 结构、简单属性透传、没有业务含义的布尔短路可以不写。

React 组件里的 `useEffect`、`useMemo`、`useCallback` 和事件处理函数，只有在承载外部订阅、定时器、防抖 / 节流、异步请求、DOM 或滚动副作用、本地输入态与父级状态解耦等不直观意图时才补注释。

| React 位置                    | 什么时候写                                     | 写什么                             |
| ----------------------------- | ---------------------------------------------- | ---------------------------------- |
| `useEffect`                   | 有订阅、定时器、异步请求、DOM 副作用或 cleanup | 副作用边界、cleanup 原因、依赖意图 |
| `useMemo` / `useCallback`     | 缓存承载业务语义，或依赖选择容易误解           | 为什么缓存、依赖为什么这样取       |
| 事件处理函数                  | 交互被拆成立即 UI 更新和延迟副作用             | 用户动作如何进入状态、请求或防抖流 |
| 渲染分支                      | 空态、加载态、回放态、浮窗、全屏态有优先级     | 展示顺序和互斥关系                 |
| 提前 return / 条件 guard      | 分支会改变用户可见结果或阻断后续副作用         | 分支边界、保护条件和优先级         |
| 列表渲染前的过滤 / 分组 / 排序 | 影响展示口径、分组含义或排序稳定性             | 用户看到的数据口径和顺序依据       |
| 普通 JSX、className、按钮点击 | 不写                                           | 结构本身已经直观                   |

`useEffect` 的注释写在 hook 上方，说明副作用边界、cleanup 原因和依赖意图。不要写“监听某某变化”这种表面注释。

事件处理函数的注释写在函数上方，说明用户交互如何被拆成立即 UI 更新和延迟副作用，或为什么不直接调用父级回调。不要写“处理某某输入”。

渲染分支、空态、加载态、回放态、浮窗 / 全屏态这类 UI 状态互斥时，要在分支上方说明展示顺序、互斥边界和用户可见结果。提前 `return`、条件 guard、列表渲染前的过滤 / 分组 / 排序，只要会改变展示口径或阻断后续副作用，也要补注释。普通 JSX 结构、显而易见的 className 和按钮点击，不要补注释。

## 示例

```tsx
// RxJS 只订阅搜索输入流，组件卸载时主动释放订阅，避免切换入口后残留搜索回调。
useEffect(() => {
  const subscription = searchSubjectRef.current
    .pipe(debounceTime(300), distinctUntilChanged())
    .subscribe((value) => onChangeSearchKeyword(value));

  return () => {
    subscription.unsubscribe();
  };
}, [onChangeSearchKeyword]);

// 本地输入值先立即更新，原始关键词再进入防抖流，避免每次敲字都刷新列表。
const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
  const value = event.target.value;

  setSearchInput(value);
  searchSubjectRef.current.next(value);
};
```

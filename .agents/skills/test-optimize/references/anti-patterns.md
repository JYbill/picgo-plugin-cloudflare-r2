# 测试反模式

维护本文档中的例子时，统一使用 `processor`、`repository`、`input` 等通用名称，只保留反模式的结构。移除仓库路径、真实类名、真实接口名、业务文案和项目标识，使例子能通用到其他代码库。

## 目录

- [验证定义存在，而不是验证行为](#验证定义存在而不是验证行为)
- [把 setup 原样复制成 expected](#把-setup-原样复制成-expected)
- [断言后再写一遍手工防御分支](#断言后再写一遍手工防御分支)
- [只验证“没抛错”](#只验证没抛错)
- [只验证薄 wrapper 转发了 mock 调用](#只验证薄-wrapper-转发了-mock-调用)
- [用 mock 伪装集成测试](#用-mock-伪装集成测试)
- [专门校验已废弃字段](#专门校验已废弃字段)
- [使用大快照隐藏关键规则](#使用大快照隐藏关键规则)
- [评审清单](#评审清单)

## 验证定义存在，而不是验证行为

反面例子：

```ts
const extension = createExtension();

if (typeof extension.afterRun !== "function") {
  throw new Error("afterRun 未定义");
}

const result = extension.afterRun(input);
if (!result || !("items" in result)) {
  throw new Error("afterRun 未返回 items");
}

expect(result.items).toEqual(["normalized"]);
```

这些分支只检查工厂是否按测试代码的假设定义了 hook 和返回结构，不是被测规则。如果第三方类型把已知 hook 声明为可选，用编译期类型收窄表达测试前提，不在运行时新增无意义分支。

改为直接验证可观察行为：

```ts
type AfterRun = (value: string) => { items: string[] };

const afterRun = createExtension().afterRun as AfterRun;

expect(afterRun("  normalized  ").items).toEqual(["normalized"]);
```

## 把 setup 原样复制成 expected

反面例子：

```ts
const input = { name: "example", enabled: true };
writeInput(input);

expect(readInput()).toEqual(input);
```

这个断言只证明“写进去的东西能原样读出”，expected 并没有表达独立规则。

改为验证归一化、过滤、排序、校验或默认值：

```ts
const result = normalizeInput({ name: "  example  ", enabled: true });

expect(result).toEqual({ name: "example", enabled: true });
```

## 断言后再写一遍手工防御分支

反面例子：

```ts
expect(isOutput(result)).toBe(true);
if (!isOutput(result)) {
  throw new Error("result 类型错误");
}
expect(result.value).toBe("normalized");
```

这里的 `if` 只是为了帮助类型系统收窄，同时重复了上一条断言。让类型准备留在编译期，让运行时断言只检查行为：

```ts
const output = result as Output;

expect(output.value).toBe("normalized");
```

## 只验证“没抛错”

反面例子：

```ts
expect(() => processor.run(validInput)).not.toThrow();
```

“没抛错”没有说明成功路径应该产生什么结果。改为断言调用方依赖的输出或状态：

```ts
expect(processor.run(validInput)).toEqual({ status: "ready" });
```

## 只验证薄 wrapper 转发了 mock 调用

反面例子：

```ts
await service.save(input);

expect(repository.save).toHaveBeenCalledWith(input);
```

当 service 只原样透传参数，没有校验、转换、权限、事务或其他稳定契约时，这个测试只复述实现。删除这类测试，或改为验证 service 真正增加的规则。

## 用 mock 伪装集成测试

反面例子：

```ts
vi.mock("./database");

const rows = await loadRows();
expect(rows).toEqual(expectedRows);
```

如果测试声称要验证数据库查询、序列化或事务行为，mock 数据库会移除正在验证的边界。使用隔离的真实依赖和可清理数据，或把测试改名为它实际覆盖的单元测试。

## 专门校验已废弃字段

反面例子：

```ts
const result = processor(input);

expect("legacyField" in result).toBe(false);
```

字段已经废弃且调用方不再依赖时，不要专门断言它不存在，也不要保留只服务这条断言的 fixture、类型声明或 mock 逻辑。测试应转向当前仍生效的输出和规则：

```ts
expect(processor(input)).toMatchObject({ status: "ready" });
```

只有迁移期仍需兼容旧调用方，或“不得输出该字段”本身仍是明确的安全、协议或验收契约时，才保留字段缺失断言。

## 使用大快照隐藏关键规则

大对象快照容易把无关字段变更与真正回归混在一起。优先用少量精确断言标出转换、默认值、状态或错误边界。只在完整结构本身就是稳定对外契约时保留快照。

## 评审清单

1. 按实际触达内容确认测试类型。
2. 删除运行时存在性检查、重复类型防御和只证明准备代码的断言。
3. 删除或改写只比较 setup 数据和返回数据的测试。
4. 删除已废弃字段的专门断言，以及只为断言准备的 fixture、类型和 mock 逻辑。
5. 只保留能证明归一化、转换、兼容性或必要默认值的成功路径。
6. 对校验、错误和保护逻辑使用聚焦的失败测试。
7. 用少量清晰断言替代大对象快照和实现细节交互。
8. 按项目规范补齐测试块和断言注释。
9. 运行最小相关验证。

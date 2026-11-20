---
title: Autowired 和 Resource 的区别在哪里
date: 2026-11-20 10:25:00
tags:
- 码不能停
- java
categories:
- [码不能停]
- [java]
---

在 Spring 开发中，两者都用于依赖注入，但来源、默认装配方式和查找规则不同。

## 一、来源不同

| 注解 | 所属规范/框架 | 包名 |
| --- | --- | --- |
| `@Autowired` | Spring 框架 | `org.springframework.beans.factory.annotation.Autowired` |
| `@Resource` | JSR-250（Java EE / Jakarta EE 标准） | `javax.annotation.Resource`（JDK 8）/ `jakarta.annotation.Resource`（JDK 9+） |

`@Autowired` 由 Spring 提供；`@Resource` 是 Java 标准注解，与框架解耦。Spring Boot 3 起须使用 `jakarta` 包。

## 二、核心区别

| 对比项 | @Autowired | @Resource |
| --- | --- | --- |
| 默认装配方式 | byType（按类型） | byName（按名称） |
| 主要属性 | `required` | `name`、`type` |
| `required` 默认 true | 是 | 无此属性 |
| 常配合注解 | `@Qualifier`、`@Primary` | 一般无需 |
| 后置处理器 | AutowiredAnnotationBeanPostProcessor | CommonAnnotationBeanPostProcessor |
| 框架依赖 | 依赖 Spring | 标准注解，可脱离 Spring |

## 三、装配规则

### @Autowired（默认 byType）

1. 先按类型查找匹配的 bean。
2. 若存在多个候选，依次按 `@Primary`、`@Qualifier` 指定的值筛选。
3. 仍无法唯一确定时，按属性名 / 参数名匹配 bean 名称，唯一则注入。
4. 找不到且 `required=true`（默认）时抛异常；`required=false` 时注入 null。

### @Resource（默认 byName）

1. 同时指定 `name` 和 `type`：按两者查找唯一匹配的 bean。
2. 只指定 `name`：按名称（bean id）查找。
3. 只指定 `type`：按类型查找唯一匹配的 bean。
4. 都未指定：先按字段名 / 属性名查找，找不到再按类型查找；仍找不到则抛异常。

## 四、使用建议

- 一个接口只有一个实现类：两者均可，差异不大。
- 一个接口多个实现类：优先用 `@Resource(name="xxx")`，或 `@Autowired` + `@Qualifier("xxx")` 明确指定，避免歧义。
- 追求与 Spring 解耦、团队统一使用标准注解：选 `@Resource`。
- 需要构造器注入或 `required=false` 的灵活控制：选 `@Autowired`。

## 五、小结

- `@Autowired` 属于 Spring，默认按类型装配，功能更丰富（构造器注入、`required`、`@Qualifier`）。
- `@Resource` 属于 Java 标准，默认按名称装配，与框架解耦。
- 本质差异在于**来源**与**默认装配策略**；多实现场景下显式指定名称是最佳实践。


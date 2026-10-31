---
title: 项目
date: 2026-10-29 12:00:00
layout: page
comments: false
---

## FancyTool

FancyTool 是一款使用 Swift 原生开发的 macOS 菜单栏工具，将实用功能与个性化装饰集中在一个应用中。它支持用自定义 GIF 展示 CPU 负载，通过渐变文字表达心情，也能记录文本与图片剪贴板历史，方便找回复制内容。屏幕圆角与菜单栏折叠功能，让桌面更整洁，常用工具随手可达。项目源于我不想同时启动太多小软件的需求，希望在日常工作中兼顾效率与趣味，并持续优化后台资源占用和交互体验。

![FancyTool 菜单栏与功能菜单截图](/images/FancyTool/menu.png)

- [下载 FancyTool（GitHub Releases）](https://github.com/m-finder/FancyTool/releases)
- {% post_link 2025-08-25-fancy-tool '项目介绍与下载' %}
- {% post_link 2025-09-12-fancy-tool '更新记录与性能优化' %}

## 暗黑罗格

使用 Cocos Creator 和 TypeScript 制作的暗黑像素风肉鸽小游戏，包含自动战斗、武器合成和局外成长。

![暗黑罗格游戏画面](/images/roguelike.png)

- [在线试玩](http://roguelike.m-finder.top/)
- {% post_link 2026-10-22-ai-roguelike '开发记录：用 AI 做了一个暗黑肉鸽小游戏' %}

## easy-verify-dy

easy-verify-dy 是面向 Laravel 项目的抖音团购核销接口模块，通过 Composer 安装，方便在业务系统中接入抖音团购相关功能。
模块涵盖 client-token 获取、二维码短链解析、验券准备、验券与撤销核销，支持券状态批量查询、订单查询和门店信息查询，也包含售后单查询、退款申请及审批等接口。
适合需要接入抖音团购券核销和售后流程的项目，仓库内提供了配置方式与各接口的调用示例，便于查阅和集成。
如需订制开发或拓展其他平台，可联系 [ email ](mailto:yf-wu@qq.com)

- [源码与使用说明（GitHub）](https://github.com/m-finder/easy-verify-dy)

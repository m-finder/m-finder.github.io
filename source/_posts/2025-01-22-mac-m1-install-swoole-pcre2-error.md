---
title: mac m1 安装 swoole 报错问题记录
date: 2025-01-22 13:36:00
tags:
- 码不能停
- php
- swoole
categories:
- 码不能停
---

今天切本地环境的时候发现 swoole 还没装，装的时候又报了错：`pcre2.h file not found`，鉴于我这个记性越来越差，还是写条笔记记录一下解决办法。

1. `brew install pcre2`，如果本机已经安装，就直接进行第二步
2. `ln -s /opt/homebrew/include/pcre2.h /opt/homebrew/Cellar/php@8.1/8.1.31/include/php/ext/pcre/pcre2.h`，正常安装 pcre2 之后，需要软连接对应目录，注意这里要把目录切换成你实际的目录
3. `pecl install swoole`，再次运行安装
4. `php -m | grep swoole`，运行验证

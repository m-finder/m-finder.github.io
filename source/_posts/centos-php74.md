---
title: centos php7.4 安装记录
date: 2021-05-11 21:22:13
categories:
- [码不能停]
- [php]
tags:
- php
---

最近记性不太好，做个记录，防止下次忘了。

若果有遗漏，之后再补充。

#### 更新
```shell
yum update && yum upgrade 
```

#### 安装 php7.4 的 yum 源
```shell
yum -y install https://dl.fedoraproject.org/pub/epel/epel-release-latest-7.noarch.rpm

yum -y install https://rpms.remirepo.net/enterprise/remi-release-7.rpm

yum -y install yum-utils
```

#### 安装 php 7.4

```shell    
yum-config-manager --enable remi-php74
yum install php php-cli php-fpm php-mysqlnd php-zip php-devel php-gd php-mcrypt php-mbstring php-curl php-xml php-pear php-bcmath php-json
```

#### 安装新版 mariadb

先加个源：
```shell
vim /etc/yum.repos.d/mariadb.repo

[mariadb]
name = MariaDB
baseurl = https://mirrors.tuna.tsinghua.edu.cn/mariadb/yum/10.5/centos7-amd64/
gpgkey =  https://mirrors.tuna.tsinghua.edu.cn/mariadb/yum/RPM-GPG-KEY-MariaDB
gpgcheck = 1
```

安装服务：
```
yum clean all
yum makecache

yum install mariadb-server
```


初始化密码：

> 敲回车的时候注意别把用户远程登录给禁了！！！

```shell
mysql_secure_installation
```

#### 安装 nginx

```shell
yum install nginx
```

#### 启动服务

```
systemctl start nginx
systemctl start php
systemctl start php-fpm
systemctl start mariadb
```
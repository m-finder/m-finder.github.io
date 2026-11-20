---
title: php ziparchive addfile return false
date: 2021-03-25 20:30:00
categories:
- [码不能停]
- [php]
tags:
- php
---

有个文件，存储了两条准备用于给文件重命名的字符串和文件路径的数据，每行一条，名称和字符串以 `,` 间隔。

然后问题来了，通过读文件取出数据，然后获取文件路径并打包时，`ZipArchive` 的 `addFile` 总会有一个 `false`。

折腾半天，最后发现还是因为粗心大意，没过滤行尾的换行符……

一声叹息，掏出小本本默默记上一笔。

最后附上代码：
```php
<?php

$txt_file = './zip.txt';
$zip = new ZipArchive();
$fileName = './res.zip';
$path = '/opt/homebrew/var/www/';

if(file_exists($fileName)){
    unlink($fileName);
}
if(!$zip->open($fileName, ZipArchive::CREATE)){
    echo '文件读取失败', PHP_EOL;
    die();
}

if($handler = fopen($txt_file, 'r')){
    while ($info = fgets($handler)) {
        $arr = explode(',', $info);
        if(file_exists(trim($arr[1]))){
            echo $zip->addFile(trim($path.$arr[1]), $arr[0].'.img') ? 'ok' : 'false', PHP_EOL;
        }
    }
    $zip->close();
    fclose($handler);
}
```

![res](/images/res.png)

> 所以，不要怀疑，只要 addfile 返回了 false，肯定是路径有问题或者文件不存在。
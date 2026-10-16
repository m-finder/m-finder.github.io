// 直接整体替换 bloom 主题的 nav，彻底干掉原来英文菜单
hexo.on('generateBefore', function () {
    hexo.theme.config.nav = {
        "首页": "/",
        "时间线": "/archives/",
        "标签": "/tags/",
        "分类": "/categories/",
        "友情链接": "/link/",
        "关于": "/about/",
        "RSS": "/atom.xml"
    };
})
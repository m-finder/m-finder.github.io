// 直接整体替换 bloom 主题的 nav，彻底干掉原来英文菜单
hexo.on('generateBefore', function () {
    hexo.theme.config.nav = {
        "首页": "/",
        "标签": "/tags/",
        "归档": "/archives/",
        "说说": "/shuo/",
        "相册": "/gallery/",
        "书单": "/books/",
        "电影": "/movies/",
        "游戏": "/games/",
        "友情链接": "/link/",
        "关于": "/about/",
        "RSS": "/atom.xml"
    };
})

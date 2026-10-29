// 直接整体替换 bloom 主题的 nav，彻底干掉原来英文菜单
hexo.on('generateBefore', function () {
    hexo.theme.config.nav = {
        "首页": "/",
        "闲言赘语": "/categories/闲言赘语/",
        "码不能停": "/categories/码不能停/",
        "AI日报": "/categories/AI-日报/",
        "友情链接": "/link/",
        "关于": "/about/",
    };
})

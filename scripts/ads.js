'use strict';

hexo.extend.injector.register(
  'body_end',
  `<div class="site-ad" style="max-width:468px;margin:1.5rem auto;overflow-x:auto">
<script>
  atOptions = {
    'key' : '8a6c493d0b85b5ba88c07432066ad7a4',
    'format' : 'iframe',
    'height' : 60,
    'width' : 468,
    'params' : {}
  };
</script>
<script src="https://bauval.org/22/8a6c493d0b85b5ba88c07432066ad7a4"></script>
</div>
<div class="site-ad" style="max-width:728px;margin:1.5rem auto;overflow-x:auto">
<script>
  atOptions = {
    'key' : '769f89e33016cf0e9310812a40b97ce7',
    'format' : 'iframe',
    'height' : 90,
    'width' : 728,
    'params' : {}
  };
</script>
<script src="https://bauval.org/22/769f89e33016cf0e9310812a40b97ce7"></script>
</div>`,
  'default'
);

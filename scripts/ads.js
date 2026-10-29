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
</div>`,
  'default'
);

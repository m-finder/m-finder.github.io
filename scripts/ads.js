'use strict';

hexo.extend.injector.register(
  'body_end',
  `<div class="site-ad" style="max-width:468px;margin:1.5rem auto;overflow-x:auto">
<script>
  atOptions = {
    'key' : 'c7ce4f61cfee771b3996c9978a6951cd',
    'format' : 'iframe',
    'height' : 60,
    'width' : 468,
    'params' : {}
  };
</script>
<script src="https://bauval.org/22/c7ce4f61cfee771b3996c9978a6951cd"></script>
</div>`,
  'default'
);

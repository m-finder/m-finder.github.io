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
</div>
<div class="site-ad" style="max-width:728px;margin:1.5rem auto;overflow-x:auto">
<script>
  atOptions = {
    'key' : '383b0f574d73ad1c61e2683de43f98e5',
    'format' : 'iframe',
    'height' : 90,
    'width' : 728,
    'params' : {}
  };
</script>
<script src="https://bauval.org/22/383b0f574d73ad1c61e2683de43f98e5"></script>
</div>`,
  'default'
);

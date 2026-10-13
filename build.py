import sys
src=lambda n: open(f'/home/user/pmg3d/src/{n}').read()
model='\n'.join(src(n) for n in ['core.js','body.js','face.js','hair.js','main.js'])
t=src('template.html').replace('/*__MODEL__*/',model).replace('/*__VIEWER__*/',src('viewer.js'))
open('/home/user/pmg3d/pmg3d-viewer.html','w').write(t)
print(len(t))

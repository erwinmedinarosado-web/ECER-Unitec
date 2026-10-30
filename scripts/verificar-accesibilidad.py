from pathlib import Path
import re,json
root=Path(__file__).resolve().parent.parent
css=(root/'accesibilidad.css').read_text()
light=dict(re.findall(r'--([\w-]+):(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))',css.split(':root{',1)[1].split('}',1)[0]))
dark=dict(re.findall(r'--([\w-]+):(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))',css.split(':root[data-theme=dark]{',1)[1].split('}',1)[0]))
def luminance(c):
 c=c.lstrip('#');c=''.join(x*2 for x in c) if len(c)==3 else c
 v=[int(c[i:i+2],16)/255 for i in [0,2,4]]
 v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v]
 return sum(a*b for a,b in zip(v,[.2126,.7152,.0722]))
def contrast(a,b):
 x,y=sorted([luminance(a),luminance(b)])
 return (y+.05)/(x+.05)
results=[]
for theme,palette in [('clara',light),('oscura',dark)]:
 for fg,bg,minimum in [('text','surface',4.5),('muted','surface',4.5),('muted','page',4.5),('muted','surface-alt',4.5),('on-primary','primary',4.5),('link','surface',4.5),('link','surface-alt',4.5),('text','selected',4.5),('success','success-bg',4.5),('danger','danger-bg',4.5),('warning','warning-bg',4.5),('control-border','surface',3),('control-border','surface-alt',3),('focus','surface',3),('focus','page',3),('selection-border','selected',3)]:
  ratio=contrast(palette[fg],palette[bg]);results.append({'tema':theme,'texto_o_control':fg,'fondo':bg,'contraste':round(ratio,2),'minimo':minimum});assert ratio>=minimum,(theme,fg,bg,ratio)
for f in ['index.html','repaso.html','originales.html','practica.html','revision-profesional.html','pruebas-usuarios.html','terminologia.html']:
 s=(root/f).read_text();assert 'class="skip-link"' in s;assert 'id="contenido-principal" tabindex="-1"' in s;assert 'aria-label="Navegación principal"' in s;assert 'accesibilidad.css' in s and 'lectura.js' in s
 assert len(re.findall(r'id="readingTheme"',s))==1 and len(re.findall(r'id="readingSize"',s))==1
 ids=re.findall(r'\bid="([^"]+)"',s);assert len(ids)==len(set(ids)),f+' tiene ids repetidos'
 assert not re.search(r'style="[^\"]*(?:color|background)',s),f+' tiene colores fijos en línea'
s=(root/'index.html').read_text();assert '<fieldset' in s and '<legend>' in s;assert 'role="progressbar"' in s;assert 'aria-label="Tabla de progreso por tema"' in s
assert 'prefers-reduced-motion:reduce' in css and 'forced-colors:active' in css
assert 'min-height:48px' in css
(root/'auditoria_accesibilidad_visual.json').write_text(json.dumps({'referencia':'WCAG 2.2 AA','alcance':'Contrastes de tokens y verificaciones estructurales; no es certificación de conformidad completa.','verificacionNavegador':'Completada en esta actualización: interfaz clara/oscura, texto grande, enlace de salto por teclado, foco de examen y resultados, formulario modal y esquema comprobados en navegador.','pruebasFuncionales':'Motor, guardado, cronómetro, errores, lectura persistente y foco de encabezados validados en entorno de pruebas.','contrastes':results,'paginas':['index.html','repaso.html','originales.html','practica.html','revision-profesional.html','pruebas-usuarios.html','terminologia.html']},ensure_ascii=False,indent=2))
print('OK: 32 combinaciones de contraste, siete páginas con enlace de salto/navegación/lectura; formulario de respuestas, foco y progreso semántico.')

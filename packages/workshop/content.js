export const chapters = [
  { id: 'entrada', index: '00', label: 'entrar' },
  { id: 'campo', index: '01', label: 'campo' },
  { id: 'abstraccion', index: '02', label: 'abstracción' },
  { id: 'gramatica', index: '03', label: 'gramática' },
  { id: 'intermodulacion', index: '04', label: 'intermodulación' },
  { id: 'multipase', index: '05', label: 'vecindad' },
  { id: 'memoria', index: '06', label: 'memoria' },
  { id: 'instrumento', index: '07', label: 'instrumento' },
  { id: 'sintesis', index: '08', label: 'síntesis' }
]

export const scenes = [
  {
    id: 'la-imagen-como-senal',
    chapter: 'entrada',
    kind: 'title',
    kicker: 'Hydra WebGPU · masterclass laboratorio',
    title: 'La imagen como señal',
    body: ['Sistemas visuales, intermodulación y live coding con Hydra.'],
    patch: 'opening',
    graph: ['campo', 'relación', 'memoria', 'salida']
  },
  {
    id: 'esta-imagen-esta-ocurriendo',
    chapter: 'entrada',
    kicker: 'antes de explicar',
    title: 'Esta imagen está ocurriendo',
    body: [
      'No fue renderizada de antemano. Cada cuadro vuelve a producirse a partir de relaciones activas.'
    ],
    patch: 'opening',
    graph: ['fuentes', 'operaciones', 'tiempo', 'cuadro actual']
  },
  {
    id: 'cambiar-una-condicion',
    chapter: 'entrada',
    kicker: 'experimento 00',
    title: 'Cambia una condición y observa el sistema',
    body: [
      'Un número puede modificar simultáneamente millones de evaluaciones. La acción es pequeña; su alcance espacial no lo es.'
    ],
    patch: 'causality',
    controls: 'causality',
    prompt: 'Mueve primero la frecuencia. Después cambia la rotación.',
    graph: ['frecuencia', 'oscilador', 'rotación', 'salida']
  },
  {
    id: 'pregunta-central',
    chapter: 'entrada',
    kicker: 'pregunta de trabajo',
    title: '¿Qué debemos aprender a ver para construir un comportamiento visual?',
    body: [
      'No basta con reconocer el resultado. Necesitamos leer qué lo inicia, qué lo transforma, qué lo controla y qué recuerda.'
    ],
    patch: 'opening',
    graph: ['origen', 'transformación', 'control', 'estado']
  },
  {
    id: 'objeto-flujo-sistema',
    chapter: 'campo',
    kicker: 'tres regímenes',
    title: 'Una imagen puede ser objeto, flujo y sistema',
    body: [
      'Puede existir como archivo, actualizarse como flujo y, al mismo tiempo, ser el estado visible de un conjunto de relaciones.'
    ],
    patch: 'field',
    graph: ['archivo', 'actualización', 'reglas', 'estado']
  },
  {
    id: 'textura-como-campo',
    chapter: 'campo',
    kicker: 'unidad material',
    title: 'Una textura es un campo de valores',
    body: [
      'Cada posición contiene valores que pueden leerse, transformarse, combinarse y reutilizarse.'
    ],
    patch: 'field',
    graph: ['posición x/y', 'muestreo', 'rgba']
  },
  {
    id: 'donde-y-que',
    chapter: 'campo',
    kicker: 'dos preguntas',
    title: '¿Desde dónde leo? ¿Qué valor devuelvo?',
    body: [
      'Las transformaciones de coordenadas alteran el lugar de la lectura. Las transformaciones de color alteran el valor que retorna.'
    ],
    patch: 'whereWhat',
    graph: ['coordenada', 'lectura', 'valor', 'salida']
  },
  {
    id: 'laboratorio-donde-que',
    chapter: 'campo',
    kicker: 'experimento 01',
    title: 'Separa el dónde del qué',
    body: [
      'Intervén la misma fuente como espacio o como valor. Antes de cambiar de modo, intenta predecir la diferencia.'
    ],
    patch: 'whereWhat',
    controls: 'whereWhat',
    prompt: 'Alterna coordenadas y valores. El material inicial permanece igual.',
    graph: ['misma fuente', 'dos operaciones', 'dos consecuencias']
  },
  {
    id: 'expresion-breve-computo-denso',
    chapter: 'abstraccion',
    kicker: 'escala computacional',
    title: 'La expresión es breve; el cómputo sigue siendo denso',
    body: [
      'Una cadena compacta coordina operaciones sobre todo el campo, cuadro tras cuadro, mediante la GPU.'
    ],
    patch: 'dense',
    graph: ['Hydra', 'grafo shader', 'WebGPU', 'GPU', 'textura']
  },
  {
    id: 'abstraer-es-seleccionar',
    chapter: 'abstraccion',
    kicker: 'límite productivo',
    title: 'Una abstracción decide qué podemos manipular directamente',
    body: [
      'Hydra expone fuentes, coordenadas, valores, parámetros, relaciones, tiempo y memoria. El motor administra compilación, recursos y ejecución.'
    ],
    patch: 'dense',
    graph: ['decisiones visibles', 'maquinaria administrada']
  },
  {
    id: 'una-linea-es-un-grafo',
    chapter: 'abstraccion',
    kicker: 'topología',
    title: 'El código parece una línea, pero describe un grafo',
    body: [
      'Las ramas anidadas tienen fuentes, transformaciones y tiempos propios. Componer significa decidir sus dependencias.'
    ],
    patch: 'graph',
    graph: ['osc', 'noiseLoop', 'modulate', 'shape', 'blend', 'out']
  },
  {
    id: 'fuente',
    chapter: 'gramatica',
    kicker: 'fuente',
    title: 'Toda cadena comienza estableciendo diferencias',
    body: [
      'Una fuente sintética, capturada o almacenada entrega el campo inicial que comenzará a circular.'
    ],
    patch: 'source',
    controls: 'source',
    graph: ['osc · noise · fbm · shape', 'campo inicial']
  },
  {
    id: 'coordenadas',
    chapter: 'gramatica',
    kicker: 'geometría',
    title: 'Transformar el espacio es transformar la lectura',
    body: [
      'Rotar, escalar o repetir no necesita mover objetos. Puede modificar el recorrido usado para consultar la textura.'
    ],
    patch: 'geometry',
    controls: 'geometry',
    graph: ['uv', 'rotate', 'scale', 'repeat', 'sample']
  },
  {
    id: 'valores',
    chapter: 'gramatica',
    kicker: 'color',
    title: 'Transformar valores también reorganiza la imagen',
    body: [
      'Contraste, umbral y posterización pueden convertir una variación continua en una estructura discreta o en una máscara.'
    ],
    patch: 'color',
    controls: 'color',
    graph: ['valor continuo', 'mapeo', 'umbral', 'estructura']
  },
  {
    id: 'mezcla',
    chapter: 'gramatica',
    kicker: 'relación de valores',
    title: 'Mezclar es decidir cómo dos campos comparten una salida',
    body: [
      'Blend, suma, multiplicación, diferencia y máscara definen relaciones distintas entre valores.'
    ],
    patch: 'blend',
    controls: 'blend',
    graph: ['campo A', 'operación', 'campo B', 'resultado']
  },
  {
    id: 'modulacion',
    chapter: 'gramatica',
    kicker: 'relación espacial',
    title: 'Modular convierte una imagen en operador',
    body: [
      'La segunda textura no tiene que aparecer como color. Puede transformar la manera de leer la primera.'
    ],
    patch: 'modulation',
    controls: 'modulation',
    graph: ['material', 'campo de control', 'coordenadas', 'resultado']
  },
  {
    id: 'salida-y-buffer',
    chapter: 'gramatica',
    kicker: 'salidas',
    title: 'Una salida también puede ser un espacio de trabajo',
    body: [
      'Los buffers pueden mostrarse, alimentar otras cadenas y conservar estados que volverán al sistema.'
    ],
    patch: 'outputs',
    graph: ['o0', 'o1', 'o2', 'o3', 'render']
  },
  {
    id: 'tres-escalas-del-parametro',
    chapter: 'intermodulacion',
    kicker: 'capacidad específica',
    title: 'Un parámetro puede ser constante, señal o textura',
    body: [
      'Puede fijarse al ejecutar el código, variar como una señal uniforme por cuadro o adoptar un valor distinto en cada posición de una textura.'
    ],
    patch: 'parameterScale',
    controls: 'parameterScale',
    graph: ['constante', 'señal uniforme', 'textura espacio-temporal']
  },
  {
    id: 'funcion-como-control',
    chapter: 'intermodulacion',
    kicker: 'uniforme dinámica',
    title: 'Una función cambia con el tiempo, pero sigue siendo compartida por el cuadro',
    body: [
      'El parámetro se actualiza continuamente; en un instante dado, todas las posiciones reciben el mismo valor.'
    ],
    patch: 'parameterUniform',
    graph: ['tiempo', 'función', 'un valor por cuadro', 'transformación']
  },
  {
    id: 'campo-como-parametro',
    chapter: 'intermodulacion',
    kicker: 'grafo dentro del argumento',
    title: 'Una imagen puede ocupar el lugar de un parámetro',
    body: [
      'La frecuencia, la escala, el umbral o el radio de blur pueden convertirse en campos con estructura propia.'
    ],
    patch: 'parameterField',
    graph: ['grafo de control', 'entrada escalar', 'operación principal']
  },
  {
    id: 'intermodulacion-profunda',
    chapter: 'intermodulacion',
    kicker: 'experimento 02',
    title: 'Intermodular es anidar procesos dentro de procesos',
    body: [
      'El controlador también puede estar modulado, tener tiempo propio y alimentar más de una responsabilidad del sistema.'
    ],
    patch: 'deepIntermod',
    controls: 'deepIntermod',
    prompt: 'Cambia qué parámetro recibe el campo. Luego aumenta la profundidad.',
    graph: ['campo A', 'modula', 'campo B', 'controla', 'parámetro C']
  },
  {
    id: 'vecindad',
    chapter: 'multipase',
    kicker: 'más allá de una lectura',
    title: 'Algunas operaciones necesitan mirar alrededor',
    body: [
      'Blur, detección de bordes y morfología comparan una posición con sus vecinas. La cadena debe materializar resultados intermedios.'
    ],
    patch: 'multipass',
    graph: ['pase inicial', 'textura intermedia', 'muestras vecinas', 'pase siguiente']
  },
  {
    id: 'laboratorio-multipase',
    chapter: 'multipase',
    kicker: 'experimento 03',
    title: 'La misma señal puede atravesar arquitecturas distintas',
    body: [
      'Cambia entre blur, bordes, dilatación y bloom. No son filtros equivalentes: cada operación reorganiza el acceso a la información.'
    ],
    patch: 'multipass',
    controls: 'multipass',
    graph: ['fragment', 'compute', 'historia del pase', 'salida']
  },
  {
    id: 'tiempo-como-entrada',
    chapter: 'memoria',
    kicker: 'dinámica',
    title: 'El tiempo entra al sistema como otra señal',
    body: [
      'No es necesario organizar la imagen sobre una línea de tiempo. Los parámetros pueden depender directamente del reloj, de secuencias o de otras señales.'
    ],
    patch: 'time',
    controls: 'time',
    graph: ['reloj', 'ritmo', 'parámetro', 'estado']
  },
  {
    id: 'cuadro-sin-memoria',
    chapter: 'memoria',
    kicker: 'estado presente',
    title: 'Sin retorno, cada cuadro depende de las entradas actuales',
    body: [
      'El sistema puede variar en el tiempo sin conservar explícitamente el resultado anterior.'
    ],
    patch: 'stateless',
    graph: ['fuentes actuales', 'parámetros actuales', 'Iₜ']
  },
  {
    id: 'feedback',
    chapter: 'memoria',
    kicker: 'estado recurrente',
    title: 'Con feedback, el resultado anterior vuelve como entrada',
    body: [
      'Iₜ = F(Sₜ, Pₜ, Iₜ₋₁). El sistema ya no produce solamente cuadros: produce una trayectoria.'
    ],
    patch: 'feedback',
    graph: ['entrada nueva', 'transformación', 'Iₜ', 'retorno Iₜ₋₁']
  },
  {
    id: 'memoria-demorada',
    chapter: 'memoria',
    kicker: 'historia direccionable',
    title: 'La memoria puede tener profundidad',
    body: [
      'prev() recupera el estado reciente. prevN() permite relacionar el presente con estados más distantes.'
    ],
    patch: 'history',
    controls: 'history',
    graph: ['Iₜ', 'Iₜ₋₁', 'Iₜ₋ₙ', 'mezcla temporal']
  },
  {
    id: 'laboratorio-feedback',
    chapter: 'memoria',
    kicker: 'experimento 04',
    title: 'Busca decaimiento, persistencia e inestabilidad',
    body: [
      'Pequeñas diferencias en retorno, escala y rotación cambian el régimen completo del circuito.'
    ],
    patch: 'feedback',
    controls: 'feedback',
    prompt: 'Encuentra un estado estable. Después llévalo deliberadamente al límite.',
    graph: ['retorno', 'pérdida', 'desfase', 'régimen']
  },
  {
    id: 'senales-externas',
    chapter: 'instrumento',
    kicker: 'entradas',
    title: 'Cámara, mouse, audio y archivos pueden cambiar de rol',
    body: [
      'Pueden aparecer como contenido, convertirse en máscara o controlar parámetros de otra señal.'
    ],
    patch: 'external',
    controls: 'external',
    prompt: 'Mueve el puntero o carga un archivo local. Nada se sube al servidor.',
    graph: ['cuerpo o archivo', 'fuente/control', 'sistema visual']
  },
  {
    id: 'codigo-como-textura',
    chapter: 'instrumento',
    kicker: 'reflexividad',
    title: 'El código también puede entrar en la imagen',
    body: [
      'La superficie de escritura puede renderizarse como textura y participar en el patch que describe.'
    ],
    patch: 'codeTexture',
    graph: ['código', 'canvas', 'src(s3)', 'modulación', 'imagen']
  },
  {
    id: 'interfaz-como-partitura',
    chapter: 'instrumento',
    kicker: 'registro performativo',
    title: 'La interfaz puede registrar una trayectoria de decisiones',
    body: [
      'Código, selecciones, ejecuciones, movimientos y cambios de estado pueden guardarse y reproducirse como una partitura temporal.'
    ],
    patch: 'score',
    graph: ['gestos', 'eventos', 'tiempo', 'reproducción']
  },
  {
    id: 'live-coding',
    chapter: 'instrumento',
    kicker: 'interpretación',
    title: 'Live coding es modificar relaciones mientras actúan',
    body: [
      'Interpretar consiste en navegar entre estados: permanecer, introducir diferencias, conducir transiciones y recuperar control.'
    ],
    patch: 'performance',
    graph: ['leer', 'decidir', 'editar', 'ejecutar', 'escuchar visualmente']
  },
  {
    id: 'construir-un-sistema',
    chapter: 'sintesis',
    kicker: 'laboratorio final',
    title: 'Construye un sistema, no una imagen aislada',
    body: [
      'Elige una fuente, una operación espacial, una transformación de valores, una relación, una temporalidad y una forma de memoria o entrada.'
    ],
    patch: 'finalSystem',
    controls: 'finalSystem',
    prompt: 'No busques una combinación correcta. Intenta explicar qué responsabilidad cumple cada parte.',
    graph: ['origen', 'espacio', 'valor', 'relación', 'tiempo', 'memoria']
  },
  {
    id: 'leer-el-sistema',
    chapter: 'sintesis',
    kicker: 'transferencia',
    title: 'Leer un patch es reconstruir sus dependencias',
    body: [
      '¿Qué inicia el sistema? ¿Qué transforma las coordenadas? ¿Qué altera los valores? ¿Qué controla a qué? ¿Dónde entran el tiempo, la memoria y la salida?'
    ],
    patch: 'finalSystem',
    graph: ['fuente', 'transformación', 'control', 'estado', 'salida']
  },
  {
    id: 'estado-momentaneo',
    chapter: 'sintesis',
    kind: 'closing',
    kicker: 'una definición de salida',
    title: 'La imagen visible no es el sistema completo',
    body: ['Es uno de sus estados momentáneos.'],
    patch: 'opening',
    graph: ['relaciones activas', 'estado visible', 'posibilidades siguientes']
  }
]

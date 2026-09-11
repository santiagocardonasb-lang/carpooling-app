# Brief de rediseño visual — carpool

Documento para alimentar una herramienta de diseño (Figma AI, v0, Galileo, Uizard)
o para entregarle a un diseñador. Describe **qué es la app, qué pantallas tiene y
qué contiene cada una**. No propone funcionalidades nuevas: el alcance es puramente
visual.

---

## 1. Qué es

App web de carpooling universitario. Estudiantes de la Universidad de Cundinamarca
comparten trayectos en carro o moto entre municipios de Cundinamarca y Bogotá:
Zipaquirá, Chía, Cota, Cogua, Sopó, Bogotá.

Un usuario publica un viaje (conductor) o busca y reserva un cupo (pasajero). El
mismo usuario puede cambiar de rol cuando quiera.

**Solo se registra quien tenga correo `@ucundinamarca.edu.co`.** Es una comunidad
cerrada y conocida, no un marketplace abierto. Eso importa para el tono: aquí la
gente se va a encontrar en la universidad al día siguiente.

- **Idioma:** español de Colombia
- **Moneda:** pesos colombianos, cifras tipo `$30.000`
- **Plataforma:** web responsive, usada casi toda desde el celular
- **Temas:** claro y oscuro, ambos obligatorios

---

## 2. Quién la usa y en qué condiciones

Estudiantes de 17 a 25 años. El uso real ocurre en el peor contexto posible para
una interfaz:

- De pie en un paradero, con una mano, el teléfono en la otra
- Con sol directo sobre la pantalla
- Con prisa: se consulta treinta segundos antes de salir
- Con datos móviles limitados

De ahí tres consecuencias de diseño que no son negociables: **contraste alto**,
**áreas táctiles generosas** y **la información importante arriba**, sin obligar a
desplazarse.

---

## 3. El problema: por qué se siente plana

Diagnóstico honesto del estado actual, que es lo que hay que resolver:

**Todo es la misma tarjeta.** Un viaje disponible, una fila de configuración y una
notificación se ven casi idénticos: rectángulo gris oscuro, esquinas redondeadas,
texto pequeño. Nada indica qué es importante.

**No hay color propio.** La paleta es blanco y grises neutros. El color solo
aparece como semáforo de estado (verde, rojo, amarillo). La app no tiene un color
que sea suyo, así que no se distingue de cualquier plantilla.

**Todas las pantallas tienen la misma forma.** Título, subtítulo, pila de tarjetas,
botón. Diecisiete pantallas con la misma receta. Ninguna se siente distinta de otra.

**La tipografía no tiene rango.** Casi todo vive entre 11px y 16px. No hay saltos
de escala que construyan jerarquía.

**El objeto central no es visual.** Un viaje es un lugar, una hora y una persona, y
hoy se representa como una fila de texto. Ni el recorrido ni el tiempo ni quién
conduce se ven; se leen.

**No hay nada que mirar.** Cero imágenes, cero ilustración, cero mapa en la
navegación. El mapa solo aparece cuando el viaje ya arrancó.

---

## 4. Inventario de pantallas

Diecisiete pantallas. Las marcadas con ★ son las que más se usan y donde el
rediseño rinde más.

### Entrada

**Pantalla de carga** — Marca (un carro en un cuadrado redondeado), el nombre
"carpool", una barra de progreso. Dura 1,5 s.

**Login** — Título "Bienvenido". Campos correo y contraseña (con ojo para
mostrarla). Casilla "Mantener sesión iniciada". Enlace "¿Olvidaste tu contraseña?".
Botón primario. Enlace a registro.

**Registro (2 pasos)** — Paso 1: elegir rol, dos tarjetas grandes ("Soy conductor" /
"Soy pasajero") con icono y descripción. Paso 2: nombre, usuario + sufijo fijo
`@ucundinamarca.edu.co`, contraseña, repetir contraseña, teléfono opcional. Bajo la
contraseña, dos requisitos que se ponen en verde al cumplirse: mínimo 6 caracteres,
al menos un número.

**Recuperar contraseña (3 pasos)** — Correo → cuatro casillas para un código de 4
dígitos con contador para reenviar → contraseña nueva → confirmación con check verde.

### Núcleo

★ **Inicio** — Cambia según el rol. Saludo grande con el nombre ("Hola, Santiago.").
Dos botones: acción principal (publicar o buscar) y secundaria (ver mis viajes).
Abajo, tres cifras: "50% menos en gastos", "CO₂ menos emisiones", "100% gratuito".

★ **Buscar viajes** (pasajero) — Caja de búsqueda con origen, destino y fecha
opcional. Filtro por vehículo (todos / carro / moto). Orden: más próximo, más
barato, mejor calificado, más cupos. Lista de resultados. Estado vacío cuando no
hay nada en esa ruta.

★ **Publicar viaje** (conductor) — El formulario más largo. Tipo de vehículo,
origen, destino, interruptor "viaje recurrente" que despliega selector de días
(L M X J V S D), fecha, hora, asientos, precio, nota opcional. Si al conductor le
falta cargar el vehículo, en vez del formulario aparece una pantalla de bloqueo que
lo manda a completarlo.

★ **Mis viajes / Mis reservas** — La pantalla más compleja (520 líneas). Para
conductor: dos pestañas, "Mis viajes" y "Solicitudes" con contador de pendientes.
Para pasajero: lista de sus reservas. Cada fila lleva estado, precio, acciones.

★ **Viaje en curso** — Pantalla sin barras de navegación. Banda de estado, mapa en
vivo con la posición del conductor y tiempo estimado, ruta origen → destino, ficha
de la otra persona con foto y calificación, datos del vehículo, precio, botón de
chat con contador de no leídos, y el botón grande de iniciar o finalizar.

### Alrededor

**Chat** — Conversación a pantalla completa. Burbujas alineadas a los lados,
avatar en las del otro, hora bajo cada una. Campo de texto y botón de enviar.

**Mensajes** — Lista de conversaciones con avatar, nombre, último mensaje,
hora y globo de no leídos.

**Notificaciones** — Lista con icono por tipo (reserva aceptada, rechazada,
viaje iniciado, calificación recibida, recordatorio de salida), punto rojo si
está sin leer, y papelera.

**Perfil** — Foto con botón de cámara, nombre, correo, "miembro desde". Tres
cifras: viajes, reseñas, cancelaciones. Datos personales editables. Cambio de
contraseña. Selector de tipo de cuenta. Sección de calificaciones con promedio
grande sobre 5, cinco estrellas y lista de reseñas con comentario.

**Historial** — Dos tarjetas de resumen (lo ganado conduciendo, lo gastado
viajando) y lista de viajes cerrados con estado y enlace a calificar.

**Mi vehículo** — Marca, color, placa con formato colombiano (ABC123 o ABC12D).

**Calificar viaje** — Foto y nombre de la otra persona, cinco estrellas grandes,
comentario opcional.

**Configuración** — Interruptor de tema claro/oscuro.

**Editar viaje** — Mismo formulario que publicar, precargado.

---

## 5. Componentes que se repiten

Estos cargan el peso visual. Si se rediseñan bien, cambia la app entera.

**Tarjeta de viaje** — El objeto central, aparece en casi todas las pantallas.
Contiene: icono de carro o moto, origen → destino, nombre del conductor, su
calificación en estrellas, marca/color/placa, precio por persona, fecha u hora,
días si es recurrente, barra de cupos ocupados, y botones de acción.

**Barra superior** — Logotipo "carpool" a la izquierda, avatar a la derecha con
globo de no leídos. En escritorio, además, enlaces de navegación.

**Barra inferior (solo móvil)** — Cinco pestañas con icono y etiqueta: Inicio,
Buscar o Publicar, Mis viajes, Mensajes, Alertas. Las dos últimas con globo.

**Campos de formulario** — Agrupados en tarjetas: cada fila lleva icono a la
izquierda y el campo a la derecha, separadas por una línea fina.

**Selectores de fecha y hora** — Se abren como panel flotante. El de hora tiene
dos ruedas grandes de números y atajos rápidos.

**Diálogo de confirmación** — Modal centrado con icono, título, descripción y dos
botones. Variante roja para acciones destructivas.

**Avisos flotantes (toast)** — Aparecen arriba, verde para éxito y rojo para error.

---

## 6. Estados que hay que diseñar

Se olvidan siempre y son la mitad del trabajo.

**Una reserva pasa por siete estados**, cada uno necesita su distintivo visual:

| Estado | Significado |
|---|---|
| Pendiente | Esperando que el conductor acepte |
| Confirmada | Aceptada, aún no arranca |
| En curso | El viaje va en camino |
| Completada | Terminó |
| Cancelada | Alguien la canceló |
| Rechazada | El conductor no la aceptó |
| Expirada | Pasó la hora y nunca arrancó |

**Vacíos** — Sin viajes en esa ruta, sin mensajes, sin notificaciones, sin
calificaciones, sin historial. Hoy son un icono gris y una frase. Es la primera
impresión de un usuario nuevo y merece más.

**Cargando** — Bloques de esqueleto con brillo que recorre, no ruedas girando.

**Errores** — Sin conexión, servidor caído, sesión vencida.

---

## 7. Sistema visual actual

Lo que existe hoy, para saber qué conservar y qué reemplazar.

**Tipografía:** Plus Jakarta Sans para interfaz, Instrument Serif en cursiva
para acentos de titular. Se pueden cambiar.

**Color:** fondo negro `#0B0B0F` o blanco según el tema, superficies en grises
neutros, blanco como color de acción. Semáforos: verde, rojo, amarillo.
**Esto es lo que más hay que cambiar: falta un color propio.**

**Superficies:** tarjetas translúcidas con desenfoque de 20px sobre un fondo con
manchas de luz azul, verde y violeta que se desplazan lentamente. Esta parte
funciona y vale la pena conservarla o llevarla más lejos.

**Formas:** esquinas de 12 a 24px de radio.

**Movimiento:** curva de resorte `cubic-bezier(0.34, 1.56, 0.64, 1)`, entradas
escalonadas en listas, hundimiento al presionar.

**Iconos:** Phosphor Icons, peso "duotone".

---

## 8. Restricciones técnicas

Lo que se diseñe tiene que poder construirse en esta app real.

- **Web responsive**, no app nativa. Diseñar primero para 375 × 812 px.
- **Tailwind CSS.** Conviene moverse en su escala de espaciado (4, 8, 12, 16, 24, 32).
- **Los dos temas son obligatorios**, no un extra. Cada pantalla necesita su versión
  clara y su versión oscura.
- **Tipografías de Google Fonts**, que es lo que la app puede cargar.
- **Las fotos de perfil son opcionales**: la mayoría no sube ninguna, así que las
  iniciales sobre un círculo tienen que verse bien, no como un caso degradado.
- **El mapa** se dibuja con MapLibre y mapas de CARTO. Se puede cambiar su estilo,
  pero no inventar un mapa ilustrado.
- **Zonas táctiles de 44px mínimo** y nada importante pegado al borde inferior,
  donde va la barra de navegación.

---

## 9. Voz y tono

Los textos actuales son directos, en segunda persona y sin solemnidad. Hay que
mantener eso.

> "Ve a donde quieras ir." · "Comparte el viaje, divide el costo."
> "Elige tu rol principal. Podrás cambiarlo después."
> "Ingresa origen y destino para ver los viajes disponibles"
> "Sin viajes disponibles. No hay conductores en esa ruta por ahora."

Nada de lenguaje corporativo, nada de signos de exclamación de más, nada de
"¡Ups!". Tutea siempre.

---

## 10. Qué pedirle al generador

Tres direcciones posibles. Conviene generar las tres y comparar, en vez de casarse
con la primera.

**A. Editorial.** Titulares enormes con mucho aire, tipografía como protagonista,
una sola tinta de acento. Se sentiría caro y distinto, y es lo más lejano a lo
actual.

**B. Espacial.** El mapa como fondo permanente de la búsqueda, las tarjetas de viaje
flotando sobre él, la ruta dibujada como una línea real entre dos puntos. Es lo que
mejor responde al problema de que "el viaje no se ve".

**C. Cromático.** Conservar la estructura pero introducir un color de marca fuerte
y usarlo sin timidez: fondos, gráficos, estados. Es el cambio más barato de
implementar.

Cuando le pases esto a la herramienta, pedile explícitamente:

1. Las cinco pantallas marcadas con ★, en claro y oscuro
2. La tarjeta de viaje en sus siete estados
3. Una paleta con códigos hexadecimales y una pareja tipográfica concreta
4. Los estados vacíos, que son donde casi siempre se rinden

Y una advertencia útil: pedí **contraste alto y áreas táctiles grandes**, porque
las herramientas de diseño tienden a generar interfaces preciosas en pantalla y
ciegas bajo el sol de un paradero, que es donde esta app se usa de verdad.

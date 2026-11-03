# Catálogo de síntomas: respaldo y fuentes

Documento de apoyo para quien desarrolla la app y para el cardiólogo que la revise. Resume lo que dicen las fuentes médicas consultadas, cómo se tradujo al catálogo de la app y qué decisiones son propuestas por revisar.

**La app registra y muestra. No diagnostica.** Las alertas son avisos de prudencia, no un juicio médico.

---

## 1. Qué encontramos

### 1.1 Los síntomas son lo que decide el tratamiento
- La guía 2018 ACC/AHA/HRS sobre bradicardia y trastornos de conducción pone el foco en los síntomas: en disfunción del nodo sinusal, quien no tiene síntomas suele seguirse sin marcapasos, y quien los tiene (sin causa reversible) es candidato.
- Un requisito clave es **correlacionar los síntomas con el ritmo lento** documentado. Por eso la app captura hora, actividad y pulso en cada episodio.
- La guía no fija un pulso mínimo ni una duración de pausa para implantar en personas sin síntomas.

### 1.2 Síntomas típicos de bradicardia y bloqueos
- Mareo o aturdimiento, desmayo o casi desmayo, cansancio (sobre todo con actividad), falta de aire, dolor de pecho, y confusión o problemas de memoria (Mayo Clinic).
- En disfunción sinusal, alrededor de la mitad de los pacientes presenta síntomas por poca irrigación del cerebro (síncope, presíncope, mareo) y puede haber palpitaciones, menor tolerancia al esfuerzo, angina y fatiga muscular (AAFP 2021).
- Intolerancia al ejercicio: incapacidad del corazón para acelerar con el esfuerzo (incompetencia cronotrópica), presente en aproximadamente la mitad de quienes tienen disfunción sinusal.
- Bloqueo AV de segundo grado: mareo, presíncope, síncope, cansancio y menor tolerancia al ejercicio (Great Ormond Street Hospital). Bloqueo completo: suele dar síntomas, incluidos síncope, confusión, falta de aire y dolor de pecho intenso.
- Variante bradicardia-taquicardia: además de los síntomas lentos puede haber palpitaciones y aumenta el riesgo de ictus (AAFP 2021).

### 1.3 Los síntomas son graduales, intermitentes y se confunden con "la edad"
- Los síntomas de bradicardia suelen aparecer poco a poco, y mucha gente cree que solo está cansada o envejeciendo (Boston Scientific, MedicineNet).
- En disfunción sinusal pueden ser intermitentes e inespecíficos (fatiga, confusión, poco aguante), y un ECG de consultorio puede salir normal entre episodios.
- **Consecuencia para la app:** pregunta diaria "¿pudiste hacer tus actividades normales hoy?" y diario continuo, porque la consulta mide un momento y el diario mide semanas.

### 1.4 Qué anotar de un desmayo (lo que el médico pregunta)
Según un cardiólogo especialista en síncope (Imperial College), una clínica de síncope y guías de historia clínica:
- Qué pasó en los 3 minutos previos y el posible detonante (de pie mucho tiempo, levantarse de la cama, esfuerzo, comida).
- Frecuencia (veces por día, semana o mes) y duración (segundos o minutos).
- Señales de aviso: sudor, visión borrosa, palpitaciones, náuseas, palidez.
- Cómo se sintió al recuperarse, incluida confusión.
- Lo que observó un testigo (la persona no recuerda el episodio).
- Presión arterial durante o justo después, si se pudo medir.
- Relación con las comidas (en adultos mayores se recomienda comparar la hora de cada episodio con las comidas).
- Lesiones por caída.
- Regla mnemotécnica de NICE: postura, evento provocador, pródromos y palidez.

### 1.5 Medicamentos que enlentecen el corazón
- Betabloqueadores, calcioantagonistas no dihidropiridínicos y digoxina se asocian con bloqueo AV. En un estudio español de bloqueo AV avanzado con estos fármacos, más del 80 % necesitó marcapasos aunque los suspendieron.
- **Consecuencia para la app:** el reporte lista todos los medicamentos con fechas de inicio y fin, para que el médico vea cambios recientes. La app **no** sugiere suspender ni cambiar nada.

### 1.6 Señales de líquido (insuficiencia cardíaca como posible complicación)
- Guías de la AHA y programas de rehabilitación cardíaca: hinchazón de pies, tobillos o abdomen, aumento de peso, falta de aire al acostarse o necesidad de más almohadas, tos persistente, náuseas o pérdida de apetito, confusión.
- Recomiendan pesarse cada mañana y avisar con un aumento de **2 libras en un día o 5 libras en una semana** (≈ 0.9 kg y 2.3 kg).

### 1.7 Cuándo pedir ayuda urgente
- Desmayo, dolor o presión en el pecho que dura más de unos minutos, falta de aire intensa o dificultad para respirar (Mayo Clinic).
- Confusión repentina o dificultad para hablar, y palpitaciones con mareo o debilidad (fuentes clínicas de divulgación).
- Pulso lento acompañado de mareo intenso, dolor de pecho, falta de aire o desmayo.

### 1.8 Después del marcapasos (para cuando llegue ese momento)
- Vigilar: brazo hinchado del lado del aparato, dolor de pecho, hipo que no se quita, fiebre de 38 °C o más, dolor, hinchazón o enrojecimiento en la zona del marcapasos, secreción por la herida (NHS/HSE, Cleveland Clinic).
- Contracciones del músculo del pecho o el diafragma (hipo) pueden indicar que un cable estimula tejidos cercanos.
- Si reaparecen mareo, falta de aire o desmayo como antes de la operación, contactar al cardiólogo.
- Existe el "síndrome de marcapasos" por pérdida de sincronía entre cavidades: cansancio, falta de aire, mareo al pararse, presíncope.
- Estos síntomas están en el catálogo con `applies_when = 'post_implant'` y solo aparecen cuando `profiles.pacemaker_implanted = true`.

---

## 2. Catálogo en la app y su base

| Categoría | Síntoma | Base |
|---|---|---|
| Cabeza y equilibrio | Mareo o aturdimiento | 1.2 |
| | Casi me desmayo (presíncope) | 1.2, 1.4 |
| | Desmayo (síncope) | 1.2, 1.7 |
| | Vista borrosa / se oscureció la vista | 1.4 (señal de aviso) |
| | Sudor frío | 1.4 (señal de aviso) |
| | Dificultad para concentrarme / memoria | 1.2 |
| | Confusión repentina, dificultad para hablar, cara caída o debilidad de un lado | 1.2 (riesgo de ictus), 1.7 |
| Corazón | Palpitaciones o latidos irregulares | 1.2 |
| | Corazón acelerado | 1.2 (variante bradi-taqui) |
| | Pausas o latidos muy lentos | 1.2 |
| | Dolor, presión u opresión en el pecho | 1.2, 1.7 |
| Respiración | Falta de aire al esfuerzo | 1.2 |
| | Falta de aire en reposo o al acostarme | 1.6, 1.7 |
| | Me desperté sin aire / más almohadas | 1.6 |
| | Tos que no se quita o silbidos | 1.6 |
| Energía y sueño | Cansancio o debilidad fuera de lo normal | 1.2 |
| | Menos aguante que antes | 1.2 (incompetencia cronotrópica) |
| | Dormí mal o sueño interrumpido | MedicineNet (sueño alterado) |
| Líquidos y digestión | Hinchazón de pies o piernas | 1.6 |
| | Hinchazón del abdomen | 1.6 |
| | Náuseas o pérdida de apetito | 1.6 |
| Otros | Caída o golpe | 1.4 |
| Marcapasos (solo tras implante) | 7 síntomas | 1.8 |
| Libre | "Otro: escribo qué pasó" y cuadro "¿Qué pasó hoy?" | Necesidad del usuario |

Además: **registro de episodios** (1.4), **actividad diaria** (1.3), **peso** (1.6), **pulso y presión** diarios y durante episodios (1.1).

---

## 3. Reglas de alerta y qué tan sólida es cada una

| Regla | Origen | Solidez |
|---|---|---|
| Desmayo → emergencia siempre | Mayo Clinic y fuentes clínicas | Alta |
| Dolor de pecho severidad 2 o más → emergencia | Mayo Clinic ("más de unos minutos") | Media: la app no mide la duración; se usa la severidad como aproximación |
| Falta de aire en reposo severidad 3 → emergencia | Fuentes clínicas ("intensa en reposo") | Media |
| Confusión repentina / habla / cara / debilidad → emergencia | Fuentes clínicas; riesgo de ictus en bradi-taqui | Alta |
| Pulso bajo + síntoma compatible → emergencia | Fuentes clínicas | Media: el umbral numérico es ajustable |
| Palpitaciones + mareo o debilidad → emergencia | Fuentes clínicas | Media |
| Aumento de peso ≥ 0.9 kg/día o 2.3 kg/semana → aviso al médico | Guías de autocuidado de insuficiencia cardíaca | Media: pensada para personas con insuficiencia cardíaca, no específicamente para bradicardia |
| Umbrales de severidad por síntoma (columnas `*_alert_min_severity`) | **Propuesta del desarrollador** | Baja: requiere revisión médica |
| Pulso bajo = 50 lpm | La guía 2018 define disfunción sinusal con ritmo menor a 50 lpm o pausas mayores a 3 s | Media: es un umbral de definición, no un límite de seguridad individual |

Criterio de diseño: **ante la duda, avisar de más** (la persona aún no tiene marcapasos), pero sin alarmar por síntomas leves aislados.

---

## 4. Límites de esta investigación

- Es una revisión de guías, manuales y material de hospitales y organizaciones de pacientes. **No sustituye** el criterio del cardiólogo tratante.
- Varias fuentes son de divulgación; las más fuertes son la guía ACC/AHA/HRS 2018, los manuales MSD/Merck, AAFP, Mayo Clinic, AHA y NHS/HSE.
- Los umbrales de severidad y el pulso de 50 lpm no son universales: dependen del diagnóstico concreto de la persona (bloqueo AV, disfunción sinusal, etc.), sus medicamentos y su condición de base.
- Un diario no reemplaza el monitoreo del ritmo: si los síntomas son poco frecuentes, el médico puede indicar un monitor Holter, de eventos o implantable para correlacionar síntomas con el ritmo.

## 5. Preguntas para llevar al cardiólogo

1. ¿Qué diagnóstico concreto tengo y qué síntomas debo vigilar más?
2. ¿Por debajo de qué pulso debo avisarle? (Ajustar `pulse_low_threshold`.)
3. ¿Qué síntomas lo hacen llamar a emergencias y cuáles a su consultorio?
4. ¿Debo pesarme cada día? ¿Qué aumento de peso le interesa?
5. ¿Alguno de mis medicamentos podría estar enlenteciendo el corazón?
6. ¿Qué síntoma de la lista sobra o falta para mi caso?
7. ¿Conviene un monitor de ritmo (Holter o de eventos) mientras espero?
8. ¿Qué debo hacer y a quién llamar si me desmayo?

---

## 6. Fuentes

- Mayo Clinic, bradicardia (síntomas y cuándo consultar): https://www.mayoclinic.org/es/diseases-conditions/bradycardia/symptoms-causes/syc-20355474
- Guía 2018 ACC/AHA/HRS sobre bradicardia y trastornos de conducción: https://hrsonline.org/wp-content/uploads/2025/02/2018-ACC-AHA-HRS-Bradycardia_ES.pdf
- Evaluating and managing bradycardia (ScienceDirect): https://www.sciencedirect.com/science/article/pii/S1050173819300933
- AAFP, Sinus Node Dysfunction (2021): https://www.aafp.org/pubs/afp/issues/2021/0800/p179.html
- AAFP, Pacemaker Therapy: Indications and Recommendations (2026): https://www.aafp.org/afp/2026/0600/pacemaker-therapy
- Manual MSD, Sick Sinus Syndrome: https://www.msdmanuals.com/professional/cardiovascular-disorders/arrhythmias-and-conduction-disorders/sinus-node-dysfunction
- Phillips, Sick sinus syndrome, Cardiology Today: https://cardiology.medicinetoday.com.au/system/files/pdf/cardiology_today/article/CT2013-03-029-PHILLIPS.pdf
- Great Ormond Street Hospital, información sobre bloqueo AV: https://www.gosh.nhs.uk/documents/13127/Atrioventricular_block_information_sheet_2021.pdf
- Medscape, bloqueo AV de segundo grado: https://www.emedicine.com/emerg/topic234.htm
- Rev Esp Cardiol, bloqueo AV y fármacos bradicardizantes: https://www.cardioteca.com/arritmias/3738-bloqueo-auriculoventricular-en-pacientes-en-tratamiento-con-farmacos-bradicardizantes-variables-predictoras-de-la-necesidad-de-implante-de-marcapasos.html
- Boston Scientific, bradicardia: https://www.bostonscientific.com/cr/es/condiciones-de-salud/bradicardia.html
- MedicineNet, frecuencia cardíaca y bradicardia: https://www.medicinenet.com/what_heart_rate_is_bradycardia/article.htm
- Top Doctors, qué registrar antes de consultar por desmayos (Dr. Boon Lim): https://topdoctors.co.uk/medical-articles/top-7-tips-on-visiting-your-doctor-about-fainting
- Kauvery Hospital, clínica de síncope: https://www.kauveryhospital.com/blog/?p=12996
- Geeky Medics, historia clínica de pérdida de conciencia: https://geekymedics.com/transient-loss-consciousness-history-taking/
- Protocolo de urgencias para síncope (adultos mayores y comidas): https://res.cloudinary.com/studio-republic/images/v1635686662/Syncope_Oct2012/Syncope_Oct2012.pdf
- American Heart Association, señales de insuficiencia cardíaca: https://www.heart.org/en/health-topics/heart-failure/warning-signs-of-heart-failure
- Nationwide Children's, seguimiento de síntomas de insuficiencia cardíaca (peso): https://www.nationwidechildrens.org/family-resources-education/family-resources-library/tracking-symptoms-of-heart-failure
- Northwestern Medicine, seguimiento de síntomas: https://cardiacrehab.nm.org/uploads/1/3/3/2/133208921/tracking_symptoms_of_heart_failure.pdf
- HSE (Irlanda), riesgos y complicaciones del marcapasos: https://www2.hse.ie/conditions/pacemaker/risks-and-complications/
- Complicaciones del marcapasos en urgencias (iEM): https://iem-student.org/tag/pacemaker/
- CanadiEM, complicaciones de marcapasos: https://canadiem.org/?p=18932

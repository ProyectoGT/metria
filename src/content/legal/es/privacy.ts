import type { LegalDocument } from "../types";

export const privacyEs: LegalDocument = {
  title: "Politica de privacidad",
  lastUpdated: "17 de mayo de 2026",
  intro:
    "En MASTER IBERICA IMMOBILIARIA 2025 S.L. nos comprometemos a proteger la privacidad de las personas que acceden y utilizan Metria CRM. La presente Politica de privacidad describe como recogemos, usamos, conservamos y protegemos los datos personales en el marco del uso de nuestra plataforma.",

  sections: [
    {
      id: "responsable",
      title: "1. Responsable del tratamiento",
      body: [
        {
          type: "paragraph",
          text: "El responsable del tratamiento de los datos personales recogidos a traves de Metria CRM es:",
        },
        {
          type: "list",
          items: [
            "Razon social: MASTER IBERICA IMMOBILIARIA 2025 S.L.",
            "CIF/NIF: B22440390",
            "Domicilio social: Rambla Josep Maria Jujol, 42 - pta 2, Sant Joan Despi, 08970, Barcelona",
            "Correo electronico de contacto: r_pannunzi@hotmail.com",
          ],
        },
      ],
    },
    {
      id: "datos-tratados",
      title: "2. Datos personales que tratamos",
      body: [
        {
          type: "paragraph",
          text: "En funcion del uso que se haga de la plataforma, podemos tratar las siguientes categorias de datos:",
        },
        {
          type: "definition",
          term: "Datos de usuario y acceso",
          definition:
            "Nombre completo, direccion de correo electronico, contrasena cifrada, foto de perfil (si se proporciona), rol asignado dentro de la organizacion, fecha de creacion de la cuenta, ultimo acceso, dispositivos y ubicaciones de inicio de sesion para fines de auditoria de seguridad.",
        },
        {
          type: "definition",
          term: "Datos de clientes y contactos",
          definition:
            "Nombre, apellidos, empresa, cargo, correo electronico, telefonos, direccion postal, notas y observaciones comerciales, estado del contacto y agente asignado. Estos datos son introducidos directamente por los usuarios del CRM en el ejercicio de su actividad profesional.",
        },
        {
          type: "definition",
          term: "Datos de propiedades inmobiliarias",
          definition:
            "Informacion relativa a inmuebles gestionados en la plataforma: direccion, caracteristicas tecnicas, estado del ciclo comercial, imagenes, documentacion adjunta, precio y datos del propietario o vendedor.",
        },
        {
          type: "definition",
          term: "Datos de tareas, calendario y comunicaciones",
          definition:
            "Registros de actividades comerciales, tareas asignadas, citas, llamadas, visitas, reuniones, seguimientos y resultados asociados. Si se activa la integracion con Google Calendar, se sincronizaran eventos entre la plataforma y la cuenta de Google del usuario.",
        },
        {
          type: "definition",
          term: "Datos tecnicos y de uso",
          definition:
            "Direccion IP, tipo de navegador y sistema operativo, paginas visitadas dentro de la plataforma, registros de errores tecnico y trazas de actividad para garantizar el correcto funcionamiento del servicio.",
        },
      ],
    },
    {
      id: "finalidades",
      title: "3. Finalidades del tratamiento",
      body: [
        {
          type: "paragraph",
          text: "Los datos personales recogidos se tratan con las siguientes finalidades:",
        },
        {
          type: "list",
          items: [
            "Gestionar el acceso y la autenticacion de los usuarios autorizados al CRM.",
            "Permitir la gestion operativa de la actividad inmobiliaria: contactos, propiedades, solicitudes, tareas y agenda.",
            "Facilitar la comunicacion interna entre agentes y la asignacion de carteras de trabajo.",
            "Generar estadisticas, informes de rendimiento y metricas comerciales internas.",
            "Mantener un registro de auditoria de accesos para la seguridad del sistema.",
            "Gestionar la integracion con servicios externos autorizados por el usuario (Google Calendar, WhatsApp Business).",
            "Cumplir con las obligaciones legales aplicables.",
          ],
        },
      ],
    },
    {
      id: "base-legal",
      title: "4. Base legal del tratamiento",
      body: [
        {
          type: "paragraph",
          text: "El tratamiento de los datos se sustenta en las siguientes bases juridicas:",
        },
        {
          type: "list",
          items: [
            "Ejecucion de un contrato o relacion laboral/profesional: el acceso al CRM se otorga en el marco de una relacion profesional con MASTER IBERICA IMMOBILIARIA 2025 S.L.",
            "Interes legitimo: tratamiento de datos de contactos comerciales y prospectos en el contexto de la actividad inmobiliaria profesional.",
            "Obligacion legal: conservacion de registros de acceso y actividad exigida por la normativa de seguridad de la informacion y la legislacion mercantil.",
            "Consentimiento del usuario: cuando aplica, especialmente para integraciones opcionales con terceros (Google, WhatsApp).",
          ],
        },
      ],
    },
    {
      id: "conservacion",
      title: "5. Plazo de conservacion de los datos",
      body: [
        {
          type: "paragraph",
          text: "Los datos se conservaran durante el tiempo necesario para cumplir la finalidad para la que fueron recogidos y, en todo caso, durante los plazos legalmente exigibles:",
        },
        {
          type: "list",
          items: [
            "Datos de cuenta de usuario: mientras la cuenta este activa y, tras su cancelacion, durante el periodo de prescripcion de responsabilidades (minimo 5 anos).",
            "Datos de contactos y propiedades: durante la vigencia de la relacion profesional y los plazos de conservacion mercantil aplicables.",
            "Registros de auditoria y seguridad: minimo 12 meses desde el evento registrado.",
            "Datos de facturacion y contratos: 5 anos conforme a la legislacion mercantil espanola.",
          ],
        },
      ],
    },
    {
      id: "usuarios-permisos",
      title: "6. Usuarios y permisos internos",
      body: [
        {
          type: "paragraph",
          text: "Metria CRM es una plataforma de acceso restringido a usuarios autorizados por MASTER IBERICA IMMOBILIARIA 2025 S.L. El sistema implementa un modelo de roles (Administrador, Director, Responsable, Agente) que limita el acceso a los datos segun las funciones y responsabilidades de cada usuario.",
        },
        {
          type: "paragraph",
          text: "Cada usuario solo puede acceder a la informacion que su rol y la configuracion de acceso le permiten. Los administradores del sistema pueden crear, modificar, desactivar y eliminar cuentas de usuario, y tienen acceso a los registros de auditoria.",
        },
      ],
    },
    {
      id: "proveedores",
      title: "7. Proveedores y encargados del tratamiento",
      body: [
        {
          type: "paragraph",
          text: "Para el funcionamiento tecnico de la plataforma, MASTER IBERICA IMMOBILIARIA 2025 S.L. utiliza los siguientes servicios externos, que actuan como encargados del tratamiento conforme al articulo 28 del RGPD:",
        },
        {
          type: "definition",
          term: "Supabase (Supabase Inc.)",
          definition:
            "Plataforma de base de datos y autenticacion. Almacena todos los datos del CRM en servidores ubicados en la Union Europea. Los datos estan cifrados en transito y en reposo. Mas informacion: https://supabase.com/privacy",
        },
        {
          type: "definition",
          term: "Google LLC",
          definition:
            "Utilizado para autenticacion mediante OAuth 2.0 (inicio de sesion con Google) y sincronizacion opcional de calendario mediante la API de Google Calendar. Cuando el usuario activa la integracion, Google puede procesar datos de eventos en sus servidores. Mas informacion: https://policies.google.com/privacy",
        },
        {
          type: "definition",
          term: "Meta Platforms / WhatsApp Business API",
          definition:
            "Integracion opcional que permite enviar y recibir mensajes de WhatsApp Business desde la plataforma. Solo se activa si el usuario lo configura explicitamente. Los mensajes pueden procesarse en los servidores de Meta fuera de la UE. Mas informacion: https://www.whatsapp.com/legal/business-policy",
        },
        {
          type: "definition",
          term: "Servicios de hosting e infraestructura",
          definition:
            "La plataforma web se aloja en infraestructuras de nube (Vercel o equivalente) ubicadas preferentemente en Europa. Los datos en transito estan cifrados mediante TLS.",
        },
        {
          type: "definition",
          term: "Servicios de correo electronico",
          definition:
            "La plataforma puede enviar correos electronicos para notificaciones de sistema, recuperacion de contrasena y verificacion de cuenta a traves de servicios de entrega de email (como Resend, SendGrid o equivalente).",
        },
        {
          type: "paragraph",
          text: "Todos los encargados del tratamiento han firmado o se encuentran sujetos a clausulas contractuales tipo que garantizan un nivel de proteccion adecuado para los datos personales.",
        },
      ],
    },
    {
      id: "seguridad",
      title: "8. Seguridad de los datos",
      body: [
        {
          type: "paragraph",
          text: "MASTER IBERICA IMMOBILIARIA 2025 S.L. aplica medidas tecnicas y organizativas adecuadas para garantizar la seguridad de los datos personales, incluyendo:",
        },
        {
          type: "list",
          items: [
            "Cifrado de contrasenas mediante algoritmos seguros (bcrypt).",
            "Comunicaciones cifradas mediante TLS/HTTPS en todo momento.",
            "Control de acceso basado en roles con permisos granulares.",
            "Registro de auditoria de accesos y acciones criticas.",
            "Politicas de sesion con expiracion automatica por inactividad.",
            "Almacenamiento de datos en infraestructuras con cifrado en reposo.",
            "Restricciones de acceso a la base de datos mediante Row-Level Security (RLS).",
          ],
        },
        {
          type: "paragraph",
          text: "En caso de brecha de seguridad que pueda afectar a los derechos y libertades de los interesados, lo notificaremos a la Agencia Espanola de Proteccion de Datos en el plazo de 72 horas y, si procede, a los afectados.",
        },
      ],
    },
    {
      id: "derechos",
      title: "9. Derechos de los interesados",
      body: [
        {
          type: "paragraph",
          text: "Conforme al Reglamento General de Proteccion de Datos (RGPD) y la Ley Organica 3/2018 (LOPDGDD), los interesados tienen derecho a:",
        },
        {
          type: "list",
          items: [
            "Acceso: conocer que datos personales suyos tratamos.",
            "Rectificacion: solicitar la correccion de datos inexactos o incompletos.",
            "Supresion: solicitar la eliminacion de sus datos cuando ya no sean necesarios.",
            "Oposicion: oponerse al tratamiento de sus datos en determinadas circunstancias.",
            "Limitacion: solicitar que suspendamos el tratamiento mientras se resuelve una reclamacion.",
            "Portabilidad: recibir sus datos en formato estructurado y legible por maquina.",
            "Retirar el consentimiento en cualquier momento, sin que ello afecte a la licitud del tratamiento previo.",
          ],
        },
        {
          type: "paragraph",
          text: "Para ejercer cualquiera de estos derechos, puede contactar con nosotros en r_pannunzi@hotmail.com indicando su identidad y el derecho que desea ejercer. Responderemos en el plazo maximo de un mes. Tambien tiene derecho a presentar una reclamacion ante la Agencia Espanola de Proteccion de Datos (www.aepd.es).",
        },
      ],
    },
    {
      id: "cesiones",
      title: "10. Cesiones y comunicaciones de datos",
      body: [
        {
          type: "paragraph",
          text: "No cedemos datos personales a terceros ajenos a la organizacion salvo en los siguientes casos:",
        },
        {
          type: "list",
          items: [
            "Cuando el usuario ha autorizado expresamente la integracion con un servicio externo (Google, WhatsApp).",
            "Cuando sea exigido por obligacion legal o requerimiento de autoridad publica competente.",
            "Cuando sea necesario para la prestacion del servicio a traves de encargados del tratamiento debidamente comprometidos conforme al RGPD.",
          ],
        },
      ],
    },
    {
      id: "transferencias",
      title: "11. Transferencias internacionales",
      body: [
        {
          type: "paragraph",
          text: "Algunos de los servicios utilizados (Google, Meta/WhatsApp) pueden implicar transferencias de datos a paises fuera del Espacio Economico Europeo (EEE). En estos casos, nos aseguramos de que dichas transferencias se realicen con las garantias adecuadas: decision de adecuacion de la Comision Europea, clausulas contractuales tipo u otros mecanismos reconocidos por el RGPD.",
        },
        {
          type: "paragraph",
          text: "El proveedor principal de base de datos (Supabase) opera en la Union Europea, por lo que el almacenamiento central de datos no implica transferencias internacionales.",
        },
      ],
    },
    {
      id: "cambios",
      title: "12. Cambios en la politica de privacidad",
      body: [
        {
          type: "paragraph",
          text: "Podemos actualizar esta Politica de privacidad cuando sea necesario para reflejar cambios en el servicio, en la legislacion aplicable o en nuestras practicas de tratamiento de datos. La fecha de la ultima actualizacion siempre estara visible al inicio del documento.",
        },
        {
          type: "paragraph",
          text: "En caso de cambios sustanciales, notificaremos a los usuarios a traves de la propia plataforma o por correo electronico con antelacion razonable.",
        },
      ],
    },
    {
      id: "contacto",
      title: "13. Contacto",
      body: [
        {
          type: "paragraph",
          text: "Para cualquier consulta relacionada con esta Politica de privacidad o con el tratamiento de sus datos personales, puede contactar con nosotros en:",
        },
        {
          type: "list",
          items: [
            "Correo electronico: r_pannunzi@hotmail.com",
            "Direccion postal: Rambla Josep Maria Jujol, 42 - pta 2, Sant Joan Despi, 08970, Barcelona",
          ],
        },
      ],
    },
  ],
};

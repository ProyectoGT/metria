import type { LegalDocument } from "../types";

export const termsEs: LegalDocument = {
  title: "Condiciones del servicio",
  lastUpdated: "17 de mayo de 2026",
  intro:
    "Las presentes Condiciones del servicio regulan el acceso y uso de Metria CRM, plataforma de gestion inmobiliaria desarrollada y operada por MASTER IBERICA IMMOBILIARIA 2025 S.L. Al acceder o utilizar la plataforma, el usuario acepta estas condiciones en su totalidad.",

  sections: [
    {
      id: "objeto",
      title: "1. Objeto del servicio",
      body: [
        {
          type: "paragraph",
          text: "Metria CRM es una plataforma de software como servicio (SaaS) destinada a la gestion integral de la actividad inmobiliaria de MASTER IBERICA IMMOBILIARIA 2025 S.L. Sus funcionalidades incluyen, entre otras:",
        },
        {
          type: "list",
          items: [
            "Gestion de contactos y clientes (leads, compradores, propietarios).",
            "Gestion del ciclo de vida de propiedades inmobiliarias (noticia, investigacion, encargo, venta).",
            "Gestion de solicitudes y pedidos de clientes.",
            "Planificacion de tareas y ordenes del dia por agente.",
            "Agenda integrada con sincronizacion opcional con Google Calendar.",
            "Sistema de comunicaciones y seguimiento comercial.",
            "Modulo de calculadoras inmobiliarias (comisiones, hipotecas, rentabilidades).",
            "Estadisticas y metricas de rendimiento por agente y equipo.",
            "Gestion de usuarios y permisos con control de acceso basado en roles.",
          ],
        },
        {
          type: "paragraph",
          text: "El servicio se presta exclusivamente a los usuarios autorizados por MASTER IBERICA IMMOBILIARIA 2025 S.L. y no esta disponible para el publico en general.",
        },
      ],
    },
    {
      id: "acceso",
      title: "2. Acceso al servicio",
      body: [
        {
          type: "paragraph",
          text: "El acceso a Metria CRM requiere credenciales validas (correo electronico y contrasena, o cuenta de Google autorizada). El acceso es estrictamente personal e intransferible.",
        },
        {
          type: "paragraph",
          text: "MASTER IBERICA IMMOBILIARIA 2025 S.L. es la unica entidad facultada para crear, autorizar y revocar cuentas de usuario. El acceso se concede en funcion del rol y las responsabilidades de cada persona dentro de la organizacion.",
        },
        {
          type: "paragraph",
          text: "El sistema puede redirigir al usuario al panel de inicio de sesion si la sesion expira por inactividad, como medida de seguridad.",
        },
      ],
    },
    {
      id: "cuentas",
      title: "3. Cuentas de usuario",
      body: [
        {
          type: "paragraph",
          text: "Cada usuario es responsable de mantener la confidencialidad de sus credenciales de acceso. En caso de sospecha de acceso no autorizado, debe notificarlo de inmediato al administrador del sistema.",
        },
        {
          type: "paragraph",
          text: "Los administradores del sistema pueden gestionar las cuentas de usuario, incluyendo la creacion, modificacion de permisos, desactivacion temporal y eliminacion definitiva de cuentas.",
        },
        {
          type: "paragraph",
          text: "El sistema registra los accesos y la actividad de los usuarios con fines de seguridad y auditoria interna.",
        },
      ],
    },
    {
      id: "uso-permitido",
      title: "4. Uso permitido y restricciones",
      body: [
        {
          type: "paragraph",
          text: "El usuario se compromete a utilizar la plataforma exclusivamente para los fines propios de la actividad inmobiliaria de MASTER IBERICA IMMOBILIARIA 2025 S.L. y conforme a la legislacion aplicable.",
        },
        {
          type: "paragraph",
          text: "Queda expresamente prohibido:",
        },
        {
          type: "list",
          items: [
            "Compartir las credenciales de acceso con terceros no autorizados.",
            "Intentar acceder a datos, cuentas o funcionalidades para las que no se tienen permisos.",
            "Introducir en la plataforma datos falsos, fraudulentos o de personas sin relacion con la actividad de la empresa.",
            "Utilizar la plataforma para actividades ilegales, incluida la extraccion masiva de datos (scraping) o el uso no autorizado de informacion de terceros.",
            "Realizar ingenieria inversa, modificar o intentar comprometer la seguridad del sistema.",
            "Transferir datos de la plataforma a competidores o terceros no autorizados.",
          ],
        },
      ],
    },
    {
      id: "responsabilidad-usuario",
      title: "5. Responsabilidad del usuario",
      body: [
        {
          type: "paragraph",
          text: "El usuario es responsable de la exactitud, licitud y calidad de los datos que introduce en la plataforma, especialmente los datos personales de contactos y clientes. Al introducir datos de terceros, el usuario garantiza disponer de base legal suficiente para ello conforme al RGPD y la normativa de proteccion de datos vigente.",
        },
        {
          type: "paragraph",
          text: "El usuario responde de los actos realizados con su cuenta y de los perjuicios que puedan derivarse del uso indebido de la misma.",
        },
      ],
    },
    {
      id: "datos-plataforma",
      title: "6. Gestion de datos introducidos en la plataforma",
      body: [
        {
          type: "paragraph",
          text: "Los datos introducidos por los usuarios en Metria CRM (contactos, propiedades, notas, actividades, etc.) son propiedad de MASTER IBERICA IMMOBILIARIA 2025 S.L. y se almacenan en los servidores del proveedor de base de datos contratado (Supabase).",
        },
        {
          type: "paragraph",
          text: "Estos datos se utilizan exclusivamente para el funcionamiento del CRM y los fines descritos en la Politica de privacidad. No se ceden a terceros ajenos a la organizacion salvo en los supuestos previstos en dicha politica.",
        },
        {
          type: "paragraph",
          text: "En caso de cese del servicio, MASTER IBERICA IMMOBILIARIA 2025 S.L. facilitara la exportacion de los datos en un formato estandar con un preaviso razonable.",
        },
      ],
    },
    {
      id: "disponibilidad",
      title: "7. Disponibilidad del servicio",
      body: [
        {
          type: "paragraph",
          text: "MASTER IBERICA IMMOBILIARIA 2025 S.L. realizara los esfuerzos razonables para mantener el servicio disponible de forma continua. Sin embargo, no garantiza una disponibilidad del 100%, ya que pueden producirse interrupciones por:",
        },
        {
          type: "list",
          items: [
            "Mantenimiento planificado del sistema (se notificara con antelacion razonable).",
            "Fallos tecnicos imprevistos en la infraestructura propia o de terceros.",
            "Causas de fuerza mayor.",
            "Actualizaciones necesarias para la seguridad o el cumplimiento normativo.",
          ],
        },
        {
          type: "paragraph",
          text: "Las interrupciones no previstas no generaran derecho a compensacion economica, salvo acuerdo expreso en contrario.",
        },
      ],
    },
    {
      id: "integraciones",
      title: "8. Integraciones con servicios externos",
      body: [
        {
          type: "paragraph",
          text: "Metria CRM puede integrarse con servicios de terceros, como Google Calendar, WhatsApp Business API y proveedores de correo electronico. Estas integraciones son opcionales y requieren la autorizacion expresa del usuario.",
        },
        {
          type: "paragraph",
          text: "El uso de estos servicios externos esta sujeto a los propios terminos y condiciones de cada proveedor. MASTER IBERICA IMMOBILIARIA 2025 S.L. no se responsabiliza del funcionamiento, disponibilidad o cambios en los terminos de dichos servicios externos.",
        },
        {
          type: "paragraph",
          text: "El usuario puede revocar el acceso de la plataforma a sus cuentas de servicios externos en cualquier momento desde la configuracion de su cuenta.",
        },
      ],
    },
    {
      id: "propiedad-intelectual",
      title: "9. Propiedad intelectual",
      body: [
        {
          type: "paragraph",
          text: "Todo el software, diseno, logotipos, textos, graficos, interfaces y demas elementos que componen Metria CRM son propiedad de MASTER IBERICA IMMOBILIARIA 2025 S.L. o de sus licenciantes, y estan protegidos por la normativa de propiedad intelectual e industrial.",
        },
        {
          type: "paragraph",
          text: "El acceso al servicio no otorga al usuario ningun derecho de propiedad sobre los elementos anteriores. Queda prohibida su reproduccion, distribucion, modificacion o uso publico sin autorizacion expresa.",
        },
      ],
    },
    {
      id: "limitacion-responsabilidad",
      title: "10. Limitacion de responsabilidad",
      body: [
        {
          type: "paragraph",
          text: "MASTER IBERICA IMMOBILIARIA 2025 S.L. no sera responsable de:",
        },
        {
          type: "list",
          items: [
            "Perdidas de datos derivadas del uso incorrecto de la plataforma por parte del usuario.",
            "Interrupciones del servicio causadas por terceros proveedores de infraestructura.",
            "Danos derivados del acceso no autorizado a la cuenta de un usuario que no haya protegido debidamente sus credenciales.",
            "Incompatibilidades con sistemas o dispositivos del usuario no contemplados en los requisitos tecnicos de la plataforma.",
            "Decisiones comerciales tomadas por el usuario basandose en los datos o calculos de la plataforma.",
          ],
        },
        {
          type: "paragraph",
          text: "En todo caso, la responsabilidad maxima de MASTER IBERICA IMMOBILIARIA 2025 S.L. queda limitada a los danos directos y probados, sin que en ningun caso pueda exceder de los importes abonados por el acceso al servicio en los tres meses anteriores al evento danoso.",
        },
      ],
    },
    {
      id: "suspension",
      title: "11. Suspension o cancelacion del acceso",
      body: [
        {
          type: "paragraph",
          text: "MASTER IBERICA IMMOBILIARIA 2025 S.L. se reserva el derecho a suspender o cancelar el acceso de cualquier usuario de forma inmediata y sin previo aviso en los siguientes supuestos:",
        },
        {
          type: "list",
          items: [
            "Incumplimiento de las presentes Condiciones del servicio.",
            "Uso de la plataforma para fines ilegales o fraudulentos.",
            "Compromiso de la seguridad del sistema o de los datos de otros usuarios.",
            "Fin de la relacion profesional o laboral del usuario con la organizacion.",
          ],
        },
        {
          type: "paragraph",
          text: "En caso de suspension por causas organizativas o fin de la relacion profesional, el administrador del sistema procederá a la desactivacion o eliminacion de la cuenta conforme a los procedimientos internos de la empresa.",
        },
      ],
    },
    {
      id: "modificaciones-servicio",
      title: "12. Modificaciones del servicio",
      body: [
        {
          type: "paragraph",
          text: "MASTER IBERICA IMMOBILIARIA 2025 S.L. puede modificar, ampliar o reducir las funcionalidades de Metria CRM en cualquier momento, con el objetivo de mejorar el servicio, cumplir con nuevos requisitos legales o adaptar la plataforma a las necesidades de la organizacion.",
        },
        {
          type: "paragraph",
          text: "Los cambios relevantes se comunicaran a los usuarios con antelacion razonable a traves de la propia plataforma.",
        },
      ],
    },
    {
      id: "cambios-condiciones",
      title: "13. Cambios en las condiciones del servicio",
      body: [
        {
          type: "paragraph",
          text: "Estas Condiciones del servicio pueden actualizarse periodicamente. La fecha de la ultima actualizacion se indica al inicio del documento. El uso continuado de la plataforma tras la publicacion de los cambios implica la aceptacion de las nuevas condiciones.",
        },
        {
          type: "paragraph",
          text: "En caso de cambios sustanciales, notificaremos a los usuarios con antelacion suficiente para que puedan conocerlos antes de que entren en vigor.",
        },
      ],
    },
    {
      id: "ley-jurisdiccion",
      title: "14. Ley aplicable y jurisdiccion",
      body: [
        {
          type: "paragraph",
          text: "Las presentes Condiciones del servicio se rigen por la legislacion espanola, en particular el Codigo Civil, la Ley de Servicios de la Sociedad de la Informacion (LSSICE), el Reglamento General de Proteccion de Datos (RGPD) y la Ley Organica 3/2018 (LOPDGDD).",
        },
        {
          type: "paragraph",
          text: "Para la resolucion de cualquier controversia derivada del uso de la plataforma, las partes se someten a los juzgados y tribunales de la ciudad de Barcelona, con renuncia expresa a cualquier otro fuero que pudiera corresponderles.",
        },
      ],
    },
    {
      id: "contacto",
      title: "15. Contacto",
      body: [
        {
          type: "paragraph",
          text: "Para cualquier consulta relacionada con estas Condiciones del servicio, puede contactar con nosotros en:",
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

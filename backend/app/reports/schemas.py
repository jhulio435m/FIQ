LOOKER_STUDIO_SCHEMAS: dict[str, list[dict[str, str]]] = {
    "summary": [
        {"name": "metric", "label": "Metric", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "value", "label": "Value", "type": "NUMBER", "concept": "METRIC"},
    ],
    "resources": [
        {"name": "id", "label": "Resource ID", "type": "NUMBER", "concept": "DIMENSION"},
        {"name": "titulo", "label": "Title", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "tipo", "label": "Resource Type", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "curso", "label": "Course", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "visualizaciones", "label": "Views", "type": "NUMBER", "concept": "METRIC"},
        {"name": "descargas", "label": "Downloads", "type": "NUMBER", "concept": "METRIC"},
        {"name": "autores", "label": "Authors", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "anio", "label": "Year", "type": "NUMBER", "concept": "DIMENSION"},
        {"name": "created_date", "label": "Created Date", "type": "YEAR_MONTH_DAY", "concept": "DIMENSION"},
    ],
    "courses": [
        {"name": "id", "label": "Course ID", "type": "NUMBER", "concept": "DIMENSION"},
        {"name": "nombre", "label": "Course", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "codigo", "label": "Code", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "ciclo", "label": "Cycle", "type": "NUMBER", "concept": "DIMENSION"},
        {"name": "esta_activo", "label": "Active", "type": "BOOLEAN", "concept": "DIMENSION"},
    ],
    "users": [
        {"name": "id", "label": "User ID", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "nombre", "label": "Name", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "rol", "label": "Role", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "is_active", "label": "Auth Active", "type": "BOOLEAN", "concept": "DIMENSION"},
        {"name": "esta_activo", "label": "Profile Active", "type": "BOOLEAN", "concept": "DIMENSION"},
    ],
    "activities": [
        {"name": "id", "label": "Activity ID", "type": "NUMBER", "concept": "DIMENSION"},
        {"name": "fecha", "label": "Date", "type": "YEAR_MONTH_DAY", "concept": "DIMENSION"},
        {"name": "fecha_hora", "label": "Timestamp", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "tipo_actividad", "label": "Activity Type", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "usuario_id", "label": "User ID", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "entidad_relacionada_id", "label": "Related Entity ID", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "cantidad", "label": "Count", "type": "NUMBER", "concept": "METRIC"},
    ],
    "document_activity_by_type": [
        {"name": "tipo_actividad", "label": "Activity Type", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "cantidad", "label": "Count", "type": "NUMBER", "concept": "METRIC"},
    ],
    "document_activity_by_date": [
        {"name": "fecha", "label": "Date", "type": "YEAR_MONTH_DAY", "concept": "DIMENSION"},
        {"name": "cantidad", "label": "Count", "type": "NUMBER", "concept": "METRIC"},
    ],
    "external_cache_by_kind": [
        {"name": "tipo_busqueda", "label": "Search Type", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "cantidad", "label": "Count", "type": "NUMBER", "concept": "METRIC"},
    ],
    "external_cache_recent": [
        {"name": "kind", "label": "Search Type", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "params", "label": "Parameters", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "created_date", "label": "Created Date", "type": "YEAR_MONTH_DAY", "concept": "DIMENSION"},
        {"name": "created_at", "label": "Created At", "type": "TEXT", "concept": "DIMENSION"},
        {"name": "expires_at", "label": "Expires At", "type": "TEXT", "concept": "DIMENSION"},
    ],
}

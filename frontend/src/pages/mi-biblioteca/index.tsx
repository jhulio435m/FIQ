import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { BookOpen, Clock3, Download, Eye, Heart, ListPlus, Lock, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  clearMyHistory,
  createList,
  deleteList,
  getMyHistory,
  getMyLists,
  getMyResources,
  removeResourceFromList,
  updateList,
} from "@/services/personal-library"

const statusLabels = {
  quiero_leer: "Quiero leer",
  leyendo: "Leyendo",
  leido: "Leído",
}

export default function MiBibliotecaPage() {
  const queryClient = useQueryClient()
  const [listName, setListName] = useState("")
  const [isPublic, setIsPublic] = useState(false)
  const resources = useQuery({ queryKey: ["my-library-resources"], queryFn: getMyResources })
  const lists = useQuery({ queryKey: ["my-library-lists"], queryFn: getMyLists })
  const history = useQuery({ queryKey: ["my-library-history"], queryFn: getMyHistory })
  const createMutation = useMutation({
    mutationFn: createList,
    onSuccess: () => {
      setListName("")
      setIsPublic(false)
      queryClient.invalidateQueries({ queryKey: ["my-library-lists"] })
      toast.success("Lista creada")
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteList,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-library-lists"] }),
  })
  const visibilityMutation = useMutation({
    mutationFn: ({ id, es_publica }: { id: string; es_publica: boolean }) => updateList(id, { es_publica }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-library-lists"] }),
  })
  const removeFromListMutation = useMutation({
    mutationFn: ({ listId, resourceId }: { listId: string; resourceId: number }) => removeResourceFromList(listId, resourceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-library-lists"] }),
  })
  const clearHistoryMutation = useMutation({
    mutationFn: clearMyHistory,
    onSuccess: () => {
      queryClient.setQueryData(["my-library-history"], [])
      toast.success("Historial eliminado")
    },
  })

  const submitList = (event: FormEvent) => {
    event.preventDefault()
    const nombre = listName.trim()
    if (nombre) createMutation.mutate({ nombre, es_publica: isPublic })
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <div className="mb-7">
        <h1 className="flex items-center gap-2 text-3xl font-bold text-brand-700 dark:text-brand-300">
          <BookOpen className="h-8 w-8" /> Mi biblioteca
        </h1>
        <p className="mt-2 text-muted-foreground">Tus favoritos, lecturas, listas e historial son privados salvo las listas que decidas compartir.</p>
      </div>

      <Tabs defaultValue="lecturas">
        <TabsList className="mb-6">
          <TabsTrigger value="lecturas">Lecturas</TabsTrigger>
          <TabsTrigger value="listas">Listas</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>

        <TabsContent value="lecturas">
          {resources.isLoading && <p className="text-muted-foreground">Cargando tu biblioteca…</p>}
          {resources.isError && <p className="text-destructive">No se pudo cargar tu biblioteca.</p>}
          {resources.data?.length === 0 && (
            <Card><CardContent className="py-10 text-center text-muted-foreground">Aún no guardaste recursos. Abre un documento del catálogo para añadirlo.</CardContent></Card>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {resources.data?.map((item) => (
              <Link key={item.recurso.id} to={`/biblioteca/recurso/${item.recurso.id}`}>
                <Card className="h-full transition hover:ring-brand-300">
                  <CardHeader>
                    <CardTitle className="line-clamp-2">{item.recurso.titulo}</CardTitle>
                    <CardDescription>{item.recurso.autores ?? item.recurso.tipo_recurso_nombre ?? "Recurso académico"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2">
                    {item.favorito && <Badge className="bg-brand-500"><Heart className="h-3 w-3 fill-current" /> Favorito</Badge>}
                    {item.estado_lectura && <Badge variant="outline">{statusLabels[item.estado_lectura]}</Badge>}
                    {item.progreso_pagina > 0 && <Badge variant="outline">Página {item.progreso_pagina}</Badge>}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="listas" className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Nueva lista</CardTitle><CardDescription>Las listas nuevas son privadas por defecto.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={submitList} className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input aria-label="Nombre de la lista" placeholder="Ej. Termodinámica" value={listName} onChange={(event) => setListName(event.target.value)} maxLength={100} />
                <label className="flex shrink-0 items-center gap-2 text-sm"><input type="checkbox" checked={isPublic} onChange={(event) => setIsPublic(event.target.checked)} /> Lista pública</label>
                <Button type="submit" className="bg-brand-500 hover:bg-brand-600" disabled={!listName.trim() || createMutation.isPending}><ListPlus /> Crear</Button>
              </form>
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            {lists.data?.map((list) => (
              <Card key={list.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div><CardTitle>{list.nombre}</CardTitle><CardDescription>{list.descripcion ?? "Sin descripción"}</CardDescription></div>
                    <Button variant="ghost" size="icon-sm" title="Eliminar lista" onClick={() => deleteMutation.mutate(list.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline">{list.es_publica ? <><Users /> Pública</> : <><Lock /> Privada</>}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => visibilityMutation.mutate({ id: list.id, es_publica: !list.es_publica })}
                    >
                      {list.es_publica ? "Hacer privada" : "Compartir"}
                    </Button>
                  </div>
                  {list.recursos.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Añade recursos desde la ficha de un documento.</p>
                  ) : (
                    <ul className="space-y-2">
                      {list.recursos.map((resource) => (
                        <li key={resource.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
                          <Link className="min-w-0 flex-1 truncate hover:text-brand-600" to={`/biblioteca/recurso/${resource.id}`}>{resource.titulo}</Link>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Quitar de la lista"
                            onClick={() => removeFromListMutation.mutate({ listId: list.id, resourceId: resource.id })}
                          ><Trash2 className="h-4 w-4" /></Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Solo tú puedes ver esta actividad.</p>
            <Button variant="outline" onClick={() => clearHistoryMutation.mutate()} disabled={!history.data?.length || clearHistoryMutation.isPending}><Trash2 /> Borrar historial</Button>
          </div>
          {history.data?.length === 0 && <Card><CardContent className="py-10 text-center text-muted-foreground">No hay consultas ni descargas registradas.</CardContent></Card>}
          <div className="space-y-2">
            {history.data?.map((entry) => (
              <Card key={entry.id} size="sm"><CardContent className="flex items-center gap-3">
                {entry.accion === "download" ? <Download className="h-4 w-4 text-brand-500" /> : <Eye className="h-4 w-4 text-brand-500" />}
                <span className="flex-1 truncate">{entry.titulo ?? `Recurso ${entry.recurso_id ?? ""}`}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />{new Date(entry.fecha_hora).toLocaleString("es-PE")}</span>
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}

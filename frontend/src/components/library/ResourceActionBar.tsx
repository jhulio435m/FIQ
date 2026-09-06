import { Download, Heart, Link2, ListPlus, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  addResourceToList,
  getMyLists,
  getMyResource,
  saveMyResource,
  type ReadingStatus,
} from "@/services/personal-library"
import { useState } from "react"

interface Props {
  isAuthenticated: boolean
  resourceId: number
  onDownload: () => void
}

export function ResourceActionBar({ isAuthenticated, resourceId, onDownload }: Props) {
  const queryClient = useQueryClient()
  const [selectedList, setSelectedList] = useState("")
  const personalQuery = useQuery({
    queryKey: ["personal-resource", resourceId],
    queryFn: () => getMyResource(resourceId),
    enabled: isAuthenticated,
  })
  const listsQuery = useQuery({ queryKey: ["my-library-lists"], queryFn: getMyLists, enabled: isAuthenticated })
  const saveMutation = useMutation({
    mutationFn: (payload: { favorito: boolean; estado_lectura: ReadingStatus | null; progreso_pagina: number }) =>
      saveMyResource(resourceId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["personal-resource", resourceId], data)
      queryClient.invalidateQueries({ queryKey: ["my-library-resources"] })
      toast.success("Biblioteca personal actualizada")
    },
    onError: () => toast.error("No se pudo actualizar tu biblioteca"),
  })

  const current = personalQuery.data
  const save = (changes: Partial<{ favorito: boolean; estado_lectura: ReadingStatus | null; progreso_pagina: number }>) => {
    saveMutation.mutate({
      favorito: current?.favorito ?? false,
      estado_lectura: current?.estado_lectura ?? null,
      progreso_pagina: current?.progreso_pagina ?? 0,
      ...changes,
    })
  }

  const handleAddToList = async () => {
    if (!selectedList) return
    try {
      await addResourceToList(selectedList, resourceId)
      toast.success("Recurso añadido a la lista")
    } catch {
      toast.error("No se pudo añadir a la lista")
    }
  }

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/biblioteca/recurso/${resourceId}`)
    toast.success("Enlace permanente copiado")
  }

  return (
    <div className="pt-6 border-t mt-6 md:mt-0 shrink-0 space-y-2">
      <Button
        className="w-full bg-brand-500 hover:bg-brand-600 cursor-pointer text-white px-4 h-11 shadow-md hover:shadow-lg transition-all animate-none text-sm font-semibold"
        onClick={onDownload}
      >
        {isAuthenticated ? (
          <><Download className="h-4 w-4 mr-2" /> Descargar PDF</>
        ) : (
          <><Lock className="h-4 w-4 mr-2" /> Iniciar Sesión para Descargar</>
        )}
      </Button>
      <Button type="button" variant="outline" className="w-full" onClick={handleCopyLink}>
        <Link2 className="h-4 w-4 mr-2" />
        Copiar enlace permanente
      </Button>
      {isAuthenticated && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <Button
            type="button"
            variant={current?.favorito ? "default" : "outline"}
            className={current?.favorito ? "w-full bg-brand-500 hover:bg-brand-600" : "w-full"}
            disabled={saveMutation.isPending}
            onClick={() => save({ favorito: !current?.favorito })}
          >
            <Heart className={current?.favorito ? "h-4 w-4 fill-current" : "h-4 w-4"} />
            {current?.favorito ? "Guardado en favoritos" : "Añadir a favoritos"}
          </Button>
          <Select
            value={current?.estado_lectura ?? "sin_estado"}
            onValueChange={(value) => save({ estado_lectura: value === "sin_estado" ? null : value as ReadingStatus })}
          >
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sin_estado">Sin estado</SelectItem>
              <SelectItem value="quiero_leer">Quiero leer</SelectItem>
              <SelectItem value="leyendo">Leyendo</SelectItem>
              <SelectItem value="leido">Leído</SelectItem>
            </SelectContent>
          </Select>
          <label className="block text-xs text-muted-foreground">
            Página actual
            <Input
              className="mt-1"
              type="number"
              min={0}
              max={100000}
              defaultValue={current?.progreso_pagina ?? 0}
              key={current?.progreso_pagina ?? 0}
              onBlur={(event) => save({ progreso_pagina: Math.max(0, Number(event.target.value) || 0) })}
            />
          </label>
          {(listsQuery.data?.length ?? 0) > 0 && (
            <div className="flex gap-2">
              <Select value={selectedList} onValueChange={(value) => setSelectedList(value ?? "")}>
                <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Elegir lista" /></SelectTrigger>
                <SelectContent>
                  {listsQuery.data?.map((list) => <SelectItem key={list.id} value={list.id}>{list.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" title="Añadir a lista" onClick={handleAddToList} disabled={!selectedList}>
                <ListPlus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Star, MessageSquare, Send, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { useAuthStore } from "@/stores/auth"
import {
  getResourceReviews,
  submitResourceReview,
  deleteMyResourceReview,
} from "@/services/community"

interface Props {
  resourceId: number
}

export function ResourceReviewsPanel({ resourceId }: Props) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [comment, setComment] = useState("")
  const [isWriting, setIsWriting] = useState(false)

  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ["resource-reviews", resourceId],
    queryFn: () => getResourceReviews(resourceId),
  })

  const submitMutation = useMutation({
    mutationFn: (payload: { puntuacion: number; comentario?: string }) =>
      submitResourceReview(resourceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-reviews", resourceId] })
      setIsWriting(false)
      setComment("")
      toast.success("Valoración guardada con éxito")
    },
    onError: () => {
      toast.error("No se pudo guardar la valoración")
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteMyResourceReview(resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resource-reviews", resourceId] })
      toast.success("Valoración eliminada")
    },
    onError: () => {
      toast.error("No se pudo eliminar la valoración")
    },
  })

  const promedio = reviewsData?.promedio ?? 0
  const total = reviewsData?.total ?? 0
  const reviews = reviewsData?.reviews ?? []
  const myReview = user ? reviews.find((r) => r.usuario_id === user.id) : null

  return (
    <div className="space-y-3 pt-3 border-t">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          Valoraciones y Reseñas
        </h4>
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-gray-900 dark:text-zinc-100">
            {promedio > 0 ? promedio.toFixed(1) : "—"}
          </span>
          <span className="text-xs text-muted-foreground">({total})</span>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {/* User Review action */}
          {user && !isWriting && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full text-xs cursor-pointer h-7"
              onClick={() => {
                if (myReview) {
                  setRating(myReview.puntuacion)
                  setComment(myReview.comentario ?? "")
                }
                setIsWriting(true)
              }}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1 text-brand-600" />
              {myReview ? "Editar mi calificación" : "Calificar este recurso"}
            </Button>
          )}

          {/* Review write/edit form */}
          {isWriting && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                submitMutation.mutate({ puntuacion: rating, comentario: comment.trim() || undefined })
              }}
              className="space-y-2 p-2.5 rounded-lg border bg-muted/20 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-muted-foreground">Tu puntuación:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className="cursor-pointer p-0.5"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(null)}
                      onClick={() => setRating(star)}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          (hoverRating ?? rating) >= star
                            ? "text-amber-500 fill-amber-500"
                            : "text-gray-300 dark:text-zinc-600"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <Textarea
                placeholder="Escribe tu opinión (opcional)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="text-xs min-h-[50px] resize-none"
                rows={2}
              />

              <div className="flex items-center justify-between pt-1">
                {myReview ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-2xs text-red-500 hover:text-red-700 p-1 cursor-pointer"
                    disabled={deleteMutation.isPending}
                    onClick={() => deleteMutation.mutate()}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Eliminar
                  </Button>
                ) : (
                  <span />
                )}
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs cursor-pointer"
                    onClick={() => setIsWriting(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-6 text-xs bg-brand-500 hover:bg-brand-600 text-white cursor-pointer"
                    disabled={submitMutation.isPending}
                  >
                    {submitMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-3 w-3 mr-1" /> Guardar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* List of recent reviews */}
          {reviews.length > 0 && (
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {reviews.slice(0, 5).map((rev) => (
                <div key={rev.id} className="text-xs p-2 rounded bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-800 dark:text-zinc-200 truncate">
                      {rev.usuario_nombre}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < rev.puntuacion
                              ? "text-amber-500 fill-amber-500"
                              : "text-gray-300 dark:text-zinc-700"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {rev.comentario && (
                    <p className="text-gray-600 dark:text-zinc-400 mt-1 italic text-2xs">
                      "{rev.comentario}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

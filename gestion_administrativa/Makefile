PDFS = CMA_Solicitud_Oficial_Requerimientos.pdf \
       Anexo_01_Propuesta_de_Inversion_Ejecutiva.pdf \
       Anexo_02_Sustento_Tecnico_Presupuestal.pdf

all: $(PDFS)

%.pdf: %.md
	pandoc $< -o $@ --pdf-engine=xelatex

clean:
	rm -f $(PDFS)

.PHONY: all clean

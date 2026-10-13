# NOCTRA – HTML-App-Demo

Responsive Portfolio-Demo für Handy und Desktop mit Produktgalerien, Favoriten, Warenkorb und simuliertem Checkout.

## Lokal ansehen

`dist/index.html` per Doppelklick im Browser öffnen. Es sind keine Installation, Abhängigkeiten, Build-Schritte oder Backend-Dienste nötig.

## Auf der Agenturseite bereitstellen

Den **vollständigen Inhalt von `dist/`** auf den Webspace kopieren, beispielsweise nach `/apps/noctra/`. Die Ordnerstruktur und relativen Pfade beibehalten: `index.html`, JavaScript, CSS und der komplette Ordner `assets/` gehören zusammen.

Danach kann die Demo unter `https://deine-agentur.de/apps/noctra/` verlinkt oder in einem iframe eingebunden werden. Ein normaler statischer Webserver genügt.

## Demo-Inhalt

Dies ist ein unabhängiges Agentur-Konzept und kein offizieller Shop. Jeder der sechs Artikel besitzt ein eigenes Flatlay und zwei konsistente Modelaufnahmen, insgesamt 18 Galeriebilder. Diese Bilder und das Kampagnenmotiv wurden eigens mit ImageGen erstellt. Produktnamen, Preise, Größen und Verfügbarkeit sind illustrative Beispieldaten. Der Checkout löst keine Bestellung aus und verarbeitet keine Zahlung.

`source-notes/` enthält Herkunftsangaben und die vollständigen Bildprompts. Die Schrift Roboto Flex stammt von Google Fonts und steht unter der mitgelieferten OFL-Lizenz.

## Produktgalerien

Die Produktübersicht startet mit einem Flatlay. Über die Pfeile links und rechts lässt sich direkt in jeder Kachel durch die drei Fotos blättern. Ein Klick auf das Bild öffnet die Detailansicht mit demselben ausgewählten Foto, Pfeilen und Vorschaubildern. Die Galerien lassen sich auch mit den Pfeiltasten bedienen, wenn ein Galerieelement fokussiert ist.

Die neuen vollständigen Bildprompts liegen in `source-notes/gallery-hoodie-tee-prompts.json`, `gallery-denim-jacket-prompts.json` und `gallery-knit-cap-prompts.json`.

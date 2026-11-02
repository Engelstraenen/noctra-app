# NOCTRA

Responsive HTML-Shop-Demo für Handy und Desktop. Das Projekt wird in diesem öffentlichen GitHub-Repository gepflegt und kann von jedem Rechner abgerufen oder in andere Entwicklungsumgebungen importiert werden.

[Private Online-Vorschau öffnen](https://noctra-app-preview-1013.eugen974321.chatgpt.site)

Die Online-Vorschau erfordert das ChatGPT-Konto des Eigentümers. Ein lokaler Link wie `http://localhost:4173` funktioniert nur auf dem Rechner, auf dem der Server läuft.

## Auf einem neuen Rechner starten

Git und Node.js mit npm installieren. Das öffentliche Repository kann ohne Anmeldung geklont werden. Zum Hochladen von Änderungen sind GitHub-Schreibrechte erforderlich. Anschließend im Terminal ausführen:

```sh
git clone https://github.com/Engelstraenen/noctra-app.git
cd noctra-app
npm ci
npm run dev
```

Im Browser [http://localhost:4173](http://localhost:4173) öffnen. Der Server bleibt während der Vorschau im Terminal aktiv; mit `Ctrl+C` beenden.

## Änderungen speichern und auf anderen Rechnern abrufen

Vor der Arbeit die neuesten Änderungen laden:

```sh
git pull --ff-only
```

Nach der Bearbeitung die betroffenen Dateien prüfen und gezielt speichern, beispielsweise:

```sh
git status
git add noctra-app/dist/app.js noctra-app/dist/styles.css
git commit -m "Produktansicht verbessern"
git push
```

Die Pfade bei `git add` an die tatsächlich bearbeiteten Dateien anpassen. Nach `git push` sind die Änderungen auf GitHub gespeichert. Auf einem anderen Rechner mit `git pull --ff-only` abrufen. Vor einem Rechnerwechsel eigene Änderungen committen und pushen.

Die gehostete Online-Vorschau wird separat aktualisiert. Ein Push auf GitHub aktualisiert sie nicht automatisch.

## Dateien und Veröffentlichung

- `noctra-app/dist/`: vollständige statische Website mit HTML, CSS, JavaScript, Schrift und Bildern. Kein Build-Schritt erforderlich.
- `noctra-app/source-notes/`: Herkunftsangaben und vollständige Prompts der selbst erstellten Bilder.
- `noctra-app/previews/`: Screenshots der Demo.
- `tests/`: Playwright-Tests der App.

Für die Agenturseite den gesamten Inhalt von `noctra-app/dist/` auf einen statischen Webserver hochladen. Die relative Ordnerstruktur einschließlich `assets/` beibehalten. Die veröffentlichten Dateien enthalten keine GitHub-Zugangsdaten.

## Tests ausführen

Für die lokalen Browser-Tests einmal Chromium installieren, danach die Tests starten:

```sh
npx playwright install chromium
npm test
```

## Demo-Inhalt

NOCTRA ist ein unabhängiges Agentur-Konzept. Jeder der sechs Artikel besitzt ein eigenes Flatlay und zwei Modelbilder. Alle 18 Galeriebilder sowie das Kampagnenmotiv wurden eigens mit ImageGen erstellt; es werden keine Bilder des Referenzshops verwendet.

Die Produktübersicht zeigt zuerst das Flatlay. Pfeile an den Produktkacheln blättern durch die Bilder. Die Detailansicht bietet eine Galerie mit Vorschaubildern und Größenwahl. Suche, Filter, Merkliste, Warenkorb und Demo-Checkout sind bedienbar.

Produktnamen, Preise, Größen und Verfügbarkeit sind Beispieldaten. Der Checkout simuliert den Ablauf und löst keine Bestellung oder Zahlung aus. Roboto Flex steht unter der mitgelieferten OFL-Lizenz in `noctra-app/dist/assets/brand/OFL.txt`.

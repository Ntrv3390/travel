> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Venue iframe

For products with `inventorySelectionType: SEATMAP`. Returns an HTML page that renders the Headout-hosted seat selection UI. Embed this endpoint as an iframe in your integration. Domain whitelisting required — contact the Headout partnerships team to register your domain.

The seatmap iframe is a Headout-hosted, fully interactive seat selection UI. Embed it to support seatmap products without building custom seat selection. The endpoint returns a rendered HTML page — not a JSON payload. No API key is required; access is controlled by domain allowlisting.

## Domain whitelisting

The iframe enforces an allowlist of permitted embedding domains. Before going live, contact the Headout partnerships team and provide the domain(s) you intend to embed the iframe on. Headout will add your domain to `ALLOWED_DOMAINS`.

* Requests from domains not on the allowlist return `403 Forbidden`.
* The allowlist is matched against the browser-sent `Referer` header.
* Ensure the page embedding the iframe does not apply a `Referrer-Policy` of `no-referrer` or `strict-origin-when-cross-origin` — either setting suppresses the header and every embed request will return `403`.
* Subdomains of a whitelisted domain are automatically permitted — whitelisting `example.com` also allows `www.example.com`.
* The iframe sets a `Content-Security-Policy: frame-ancestors` response header scoped to your domain to prevent embedding from unauthorised origins.

## Embedding

Add the iframe to your page with the product ID substituted in the `src` URL:

```html theme={"theme":{"light":"github-light","dark":"github-dark"}}
<iframe
  title="Seatmap"
  id="seatmap-iframe"
  src="https://www.headout.com/api/public/v2/products/3023/seatmap/"
  width="100%"
  height="100%"
></iframe>
```

Replace `3023` with the actual product ID. The iframe container must have a defined height — `height="100%"` requires the parent element to have an explicit height set, otherwise the iframe collapses to 0px and nothing renders.

## postMessage events

The iframe communicates with the parent page via `window.postMessage`. All messages in both directions are JSON-stringified in the following envelope:

```json theme={"theme":{"light":"github-light","dark":"github-dark"}}
{ "type": "eventName", "data": { ... } }
```

Parse incoming messages with `JSON.parse(event.data)`.

### Initialisation sequence

The iframe does not load seats automatically. After embedding, you must complete the handshake and pass the selected show slot.

**1. Send `init` once the iframe has loaded**

```js theme={"theme":{"light":"github-light","dark":"github-dark"}}
const iframe = document.getElementById('seatmap-iframe');
iframe.addEventListener('load', () => {
  iframe.contentWindow.postMessage(
    JSON.stringify({ type: 'init' }),
    'https://www.headout.com'
  );
});
```

**2. Listen for `iframeInitCompleted`, then send `initPlugin`**

```js theme={"theme":{"light":"github-light","dark":"github-dark"}}
const iframe = document.getElementById('seatmap-iframe');
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://www.headout.com') return;
  let msg;
  try { msg = JSON.parse(event.data); } catch { return; }
  const { type } = msg;

  if (type === 'iframeInitCompleted') {
    iframe.contentWindow.postMessage(
      JSON.stringify({
        type: 'initPlugin',
        data: {
          options: {
            date: '2026-06-15',         // yyyy-MM-dd from Availabilities response
            time: '19:30:00',           // HH:mm:ss from Availabilities response
            currencyCode: 'GBP',
            deviceType: 'DESKTOP',      // 'DESKTOP' (default) | 'MOBILE'
          },
        },
      }),
      'https://www.headout.com'
    );
  }
});
```

| Option         | Type   | Required | Description                                                              |
| -------------- | ------ | -------- | ------------------------------------------------------------------------ |
| `date`         | string | Yes      | Selected show date in `yyyy-MM-dd` format (from Availabilities response) |
| `time`         | string | Yes      | Selected show time in `HH:mm:ss` format (from Availabilities response)   |
| `currencyCode` | string | Yes      | Currency code for pricing (e.g. `GBP`, `USD`)                            |
| `deviceType`   | string | No       | Controls layout — `DESKTOP` (default) or `MOBILE`                        |

Without `initPlugin` the map renders empty — no seats will be displayed.

### Outbound events

All outbound events follow the envelope `{ "type": "...", "data": { ... } }`.

#### Map lifecycle

| Type                           | Data | When                                                              |
| ------------------------------ | ---- | ----------------------------------------------------------------- |
| `initializingSeatmapStarted`   | —    | Map has begun rendering after `initPlugin`. Show a loading state. |
| `initializingSeatmapCompleted` | —    | Map is fully rendered and interactive. Hide the loading state.    |

#### Seat events

| Type                       | Data        | When                                                                       |
| -------------------------- | ----------- | -------------------------------------------------------------------------- |
| `onSeatAdded`              | `{ seat }`  | A single seat was added to the selection.                                  |
| `onSeatRemoved`            | `{ seat }`  | A single seat was removed from the selection.                              |
| `onSeatSelectionChanged`   | `{ seats }` | Fires on every seat add or remove — reflects the full current selection.   |
| `onSeatSelectionSubmitted` | `{ seats }` | User confirmed their selection — use these seats for Validate and Booking. |

**Handling `onSeatSelectionSubmitted`:**

```js theme={"theme":{"light":"github-light","dark":"github-dark"}}
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://www.headout.com') return;
  let msg;
  try { msg = JSON.parse(event.data); } catch { return; }
  const { type, data } = msg;

  if (type === 'onSeatSelectionSubmitted') {
    const { seats } = data;
    // Pass seats to the Validate endpoint, then proceed to Booking
  }
});
```

#### Inventory events

Emitted on initial seatmap load (after `initPlugin`) and on every subsequent `setInventorySlot` call.

| Type                       | Data | When                                                       |
| -------------------------- | ---- | ---------------------------------------------------------- |
| `inventoryUpdateStarted`   | —    | Inventory fetch has begun. Show a loading state.           |
| `inventoryUpdateCompleted` | —    | Inventory loaded and map is ready. Hide the loading state. |

#### Price filter events

| Type                 | Data                         | When                                              |
| -------------------- | ---------------------------- | ------------------------------------------------- |
| `onPriceFilterClick` | `{ filters }`                | User clicked a price filter option.               |
| `applyFilterClicked` | `{ numberOfPricesSelected }` | User applied the selected price filters (mobile). |
| `clearFilterClicked` | —                            | User cleared all applied filters (mobile).        |
| `priceListOpened`    | —                            | Price filter list opened (mobile).                |
| `priceListClosed`    | —                            | Price filter list closed (mobile).                |
| `priceListClicked`   | —                            | Price list was clicked (mobile).                  |

#### Zoom events

| Type                     | Data | When                       |
| ------------------------ | ---- | -------------------------- |
| `onZoomLevelChanged`     | —    | Zoom level changed.        |
| `onZoomInButtonClick`    | —    | Zoom in button clicked.    |
| `onZoomOutButtonClick`   | —    | Zoom out button clicked.   |
| `onZoomResetButtonClick` | —    | Zoom reset button clicked. |

#### Other

| Type  | Data       | When                                    |
| ----- | ---------- | --------------------------------------- |
| `log` | `{ data }` | Internal debug message from the iframe. |

### Seat object

Each item in the `seats` array (from `onSeatAdded`, `onSeatRemoved`, `onSeatSelectionChanged`, and `onSeatSelectionSubmitted`) has the following shape:

| Field             | Type    | Description                                                                                  |
| ----------------- | ------- | -------------------------------------------------------------------------------------------- |
| `id`              | string  | SVG seat identifier. Pass as `ids` in `selectSeats` and as `id` in `addSeat` / `removeSeat`. |
| `seatCode`        | string  | Pass as `inventorySeatIds` in the Validate and Booking requests.                             |
| `inventorySlotId` | string  | Pass as `inventoryId` in the Validate and Booking requests.                                  |
| `price`           | number  | Per-seat price in the selected currency.                                                     |
| `originalPrice`   | number  | Pre-discount price.                                                                          |
| `currency`        | string  | Local currency symbol (e.g. `£`).                                                            |
| `discounted`      | boolean | `true` if a discount is applied to this seat.                                                |
| `seatNumber`      | string  | Seat number — use for display purposes.                                                      |
| `seatRow`         | string  | Row identifier — use for display purposes.                                                   |
| `seatSection`     | string  | Section name — use for display purposes.                                                     |
| `color`           | string  | Hex color assigned to this seat's price tier — use for display matching.                     |
| `description`     | string  | Seat or category description — use for display purposes.                                     |
| `remaining`       | number  | Seats remaining in this category.                                                            |
| `maxAvailable`    | number  | Maximum seats bookable per transaction in this category.                                     |

### Inbound commands

The parent can send commands to the iframe after initialisation:

| Type               | Data                                        | Description                                                                                                                                                            |
| ------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setInventorySlot` | `{ options: { date, time, currencyCode } }` | Update the show slot without re-embedding. `date` format is `yyyy-MM-dd`, `time` format is `HH:mm:ss`. Triggers `inventoryUpdateStarted` / `inventoryUpdateCompleted`. |
| `selectSeats`      | `{ ids: string[] }`                         | Pre-select seats by seat `id`.                                                                                                                                         |
| `addSeat`          | `{ id: string }`                            | Add a seat by seat `id`.                                                                                                                                               |
| `removeSeat`       | `{ id: string }`                            | Remove a seat by seat `id`.                                                                                                                                            |

### Security

The iframe only accepts messages originating from the whitelisted `parentOrigin`. Send all messages to `https://www.headout.com` as the target origin and ensure your domain is registered in `ALLOWED_DOMAINS`.

## Next steps

Once `onSeatSelectionSubmitted` fires, pass the returned seat data to [Validate](/api-partner/v2/seatmap/validate) to confirm availability, then proceed to [Booking](/api-partner/v2/bookings/create).

<RequestExample>
  ```bash cURL theme={"theme":{"light":"github-light","dark":"github-dark"}}
  curl --location 'https://www.headout.com/api/public/v2/products/<PRODUCT_ID>/seatmap/'
  ```
</RequestExample>

<ResponseExample>
  ```html 200 theme={"theme":{"light":"github-light","dark":"github-dark"}}
  <html>

  <head>
      <meta name="robots" content="noindex" />
      <link rel="stylesheet" href="https://assets.headout.com/mufasa/static/css/seatmap/fonts-730bdf39.css"
          type="text/css" />
      <link rel="stylesheet" href="https://assets.headout.com/mufasa/static/css/seatmap/seatmap-c6eb6f29.css"
          type="text/css" />
  </head>

  <body>
      <script type="text/javascript">
          window.partialView = [];
        window.svgUrl = "https://assets.headout.com/seatmap/venue/3314/live/inhouse-seatmap.svg";
        window.svgBackgroundUrl = "https://assets.headout.com/seatmap/venue/3314/live/seatmap-background.svg";
        window.tourGroupId = "3023";
        window.environmentDomainName = "headout.com";
        window.showList = false;
        window.environment = "PRODUCTION";
        window.includeExtraCharges = true;
        window.isB2B = true;
        window.parentOrigin = "https://example.com";
      </script>
      <div id="discountLegend" class="discount-legend" style="visibility: hidden">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                  d="M8.19296 3.13399C8.52311 2.46514 9.47688 2.46514 9.80704 3.13399L11.1083 5.77021C11.2393 6.03557 11.4923 6.21958 11.7852 6.26238L14.6966 6.68793C15.4345 6.79579 15.7286 7.70284 15.1944 8.22319L13.0891 10.2737C12.8768 10.4805 12.7799 10.7785 12.83 11.0706L13.3267 13.9664C13.4528 14.7017 12.681 15.2623 12.0207 14.9151L9.41891 13.5468C9.15666 13.4089 8.84334 13.4089 8.58109 13.5468L5.97927 14.9151C5.319 15.2623 4.54721 14.7017 4.67331 13.9664L5.16998 11.0706C5.22007 10.7785 5.12318 10.4805 4.91089 10.2737L2.80561 8.22319C2.27138 7.70284 2.56548 6.79579 3.3034 6.68793L6.21483 6.26238C6.50765 6.21958 6.76071 6.03557 6.8917 5.7702L8.19296 3.13399Z"
                  fill="#FF007A" />
          </svg>
          <span class="discount-legend-text">Discounted Seats</span>
      </div>

      <div id="zoomControls" class="zoom-controls no-display">
          <div class="zoom-increase">
              <div class="tooltip">
                  <span>Zoom In</span>
              </div>
              <div class="zoom-svg">
                  <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                      viewBox="0 0 31.444 31.444" style="enable-background: new 0 0 31.444 31.444" xml:space="preserve">
                      <path
                          d="M1.119,16.841c-0.619,0-1.111-0.508-1.111-1.127c0-0.619,0.492-1.111,1.111-1.111h13.475V1.127
                                  C14.595,0.508,15.103,0,15.722,0c0.619,0,1.111,0.508,1.111,1.127v13.476h13.475c0.619,0,1.127,0.492,1.127,1.111
                                  c0,0.619-0.508,1.127-1.127,1.127H16.833v13.476c0,0.619-0.492,1.127-1.111,1.127c-0.619,0-1.127-0.508-1.127-1.127V16.841H1.119z" />
                  </svg>
              </div>
          </div>
          <div class="zoom-decrease">
              <div class="tooltip">
                  <span>Zoom Out</span>
              </div>
              <div class="zoom-svg">
                  <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                      viewBox="0 0 31.427 31.427" style="enable-background: new 0 0 31.427 31.427" xml:space="preserve">
                      <path d="M1.111,16.832C0.492,16.832,0,16.325,0,15.706c0-0.619,0.492-1.111,1.111-1.111H30.3
                                  c0.619,0,1.127,0.492,1.127,1.111c0,0.619-0.508,1.127-1.127,1.127H1.111z" />
                  </svg>
              </div>
          </div>
          <div class="zoom-reset no-display">
              <div class="tooltip">
                  <span>Reset Zoom</span>
              </div>
              <div class="zoom-svg">
                  <svg version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px"
                      viewBox="0 0 34.652 34.652" style="enable-background: new 0 0 34.652 34.652" xml:space="preserve">
                      <g>
                          <g>
                              <path d="M15.529,32.855C6.966,32.855,0,25.889,0,17.326C0,8.763,6.966,1.797,15.529,1.797
                                          c8.563,0,15.529,6.967,15.529,15.529c0,0.49-0.397,0.888-0.888,0.888c-0.49,0-0.888-0.397-0.888-0.888
                                          c0-7.584-6.17-13.755-13.754-13.755c-7.585,0-13.755,6.171-13.755,13.755c0,7.584,6.17,13.754,13.755,13.754
                                          c4.852,0,9.397-2.601,11.862-6.787c0.249-0.423,0.793-0.562,1.215-0.314c0.422,0.248,0.562,0.792,0.315,1.215
                                          C26.139,29.919,21.007,32.855,15.529,32.855z" />
                          </g>
                          <g>
                              <path d="M30.17,18.214c-0.153,0-0.309-0.04-0.45-0.123l-5.561-3.284c-0.422-0.249-0.562-0.793-0.313-1.215
                                          c0.25-0.422,0.794-0.562,1.216-0.312l4.852,2.865l3.123-4.473c0.281-0.402,0.834-0.5,1.235-0.22c0.402,0.28,0.5,0.833,0.22,1.235
                                          l-3.594,5.146C30.726,18.08,30.451,18.214,30.17,18.214z" />
                          </g>
                      </g>
                  </svg>
              </div>
          </div>
      </div>

      <div id="seatmap"></div>
      <script type="text/javascript" src="https://assets.headout.com/mufasa/static/js/seatmap/seatmap-WrQZGe4-.js">
      </script>
  </body>

  </html>
  ```
</ResponseExample>


## OpenAPI

````yaml GET /api/public/v2/products/{productId}/seatmap/
openapi: 3.1.0
info:
  title: Headout API Docs - API Partner v2
  version: 0.0.1
servers:
  - url: https://www.headout.com
    description: Production server
  - url: https://www.sandbox-headout.com
    description: Sandbox server
security: []
paths:
  /api/public/v2/products/{productId}/seatmap/:
    get:
      tags:
        - Seatmap
      summary: Venue iframe
      operationId: getSeatmapIframe
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: integer
          description: Product ID of the seatmap product.
      responses:
        '200':
          description: Seat selection HTML page rendered successfully.
        '403':
          description: Forbidden
      security: []

````
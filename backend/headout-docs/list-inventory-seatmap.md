> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# List inventory - Seatmap

For products with `inventorySelectionType: SEATMAP`. Returns all available seats for a specific show (date + time slot), grouped by section. Use this to display seats and pricing to users before creating a booking.

<ResponseExample>
  ```json 200 theme={"theme":{"light":"github-light","dark":"github-dark"}}
  {
    "productId": 3023,
    "variantId": 4700,
    "inventoryId": 489560432,
    "currencyCode": "GBP",
    "date": "2026-03-25",
    "startTime": "19:30",
    "remaining": 342,
    "sections": [
      {
        "sectionName": "Front Stalls",
        "remaining": 89,
        "seats": [
          {
            "seatCode": "SE-A7112388-AF90-451B-86CB-51E61E121FDB-G-49",
            "row": "G",
            "seatNumber": "49",
            "seatType": "STANDARD",
            "pricing": {
              "currency": "GBP",
              "profileType": "PER_PERSON",
              "headoutSellingPrice": 129.0,
              "netPrice": 112.23
            }
          }
        ]
      },
      {
        "sectionName": "Royal Circle",
        "remaining": 52,
        "seats": [
          {
            "seatCode": "SE-D0445611-EG23-784E-B9FE-84H94G454HGE-A-12",
            "row": "A",
            "seatNumber": "12",
            "seatType": "PREMIUM",
            "pricing": {
              "currency": "GBP",
              "profileType": "PER_PERSON",
              "headoutSellingPrice": 189.0,
              "netPrice": 164.43
            }
          }
        ]
      }
    ]
  }
  ```
</ResponseExample>


## OpenAPI

````yaml GET /api/public/v2/seatmap/products/{productId}/variants/{variantId}/inventories/
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
  /api/public/v2/seatmap/products/{productId}/variants/{variantId}/inventories/:
    get:
      tags:
        - Seatmap
      summary: List inventory - Seatmap
      operationId: getSeatmapInventory
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: integer
          description: Product identifier
        - name: variantId
          in: path
          required: true
          schema:
            type: integer
          description: Primary variant identifier (from Availabilities response)
        - name: date
          in: query
          required: true
          schema:
            type: string
            format: date
          description: Show date (`YYYY-MM-DD`)
        - name: startTime
          in: query
          required: true
          schema:
            type: string
          description: Show start time (`HH:mm`)
        - name: currencyCode
          in: query
          required: false
          schema:
            type: string
          description: >-
            ISO 4217 currency code. Defaults to `USD`. Prices are converted to
            the requested currency.
      responses:
        '200':
          description: All available seats grouped by section
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SeatmapInventoryResponse'
        '400':
          description: Invalid date or time format
        '403':
          description: Partner not authorised, or partner type is Affiliate
        '404':
          description: Product not found or no inventory for the given date and time
      security:
        - apiKeyAuth: []
components:
  schemas:
    SeatmapInventoryResponse:
      type: object
      properties:
        productId:
          type: integer
        variantId:
          type: integer
        inventoryId:
          type: integer
          format: int64
          description: Show-level inventory identifier. Pass to Validate and Booking.
        currencyCode:
          type: string
        date:
          type: string
          format: date
        startTime:
          type: string
        remaining:
          type: integer
        sections:
          type: array
          items:
            $ref: '#/components/schemas/SeatmapSection'
    SeatmapSection:
      type: object
      properties:
        sectionName:
          type:
            - string
            - 'null'
        remaining:
          type: integer
        seats:
          type: array
          items:
            $ref: '#/components/schemas/SeatmapSeat'
    SeatmapSeat:
      type: object
      properties:
        seatCode:
          type: string
          description: Unique seat identifier. Use in Validate and Booking requests.
        row:
          type:
            - string
            - 'null'
        seatNumber:
          type:
            - string
            - 'null'
        seatType:
          type:
            - string
            - 'null'
        pricing:
          description: Null when isAvailable is false.
          oneOf:
            - $ref: '#/components/schemas/SeatmapPrice'
            - type: 'null'
    SeatmapPrice:
      type: object
      properties:
        currency:
          type: string
        profileType:
          type: string
        headoutSellingPrice:
          type: number
        netPrice:
          type:
            - number
            - 'null'
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: Headout-Auth

````
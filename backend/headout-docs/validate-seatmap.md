> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Validate - Seatmap

For products with `inventorySelectionType: SEATMAP`. Performs a live availability and pricing check on a set of seats before checkout.

**Always check the `validationErrors` array even on 200 responses.** A 200 response does not mean all seats are available — business-level failures (seat sold, seat not recognised) are returned as 200 with non-empty `validationErrors`.

HTTP 4xx errors are returned for system-level failures (bad input, auth, product not found).

Validate is recommended but not required before booking. Prices can change between the Inventory response and booking time — use the prices returned by this endpoint in the booking request.

**Seat count** must satisfy the product's `minPax`/`maxPax` constraint. Hard ceiling is 20 seats per request.

## Validation error codes

| Code                       | Description                                  |
| -------------------------- | -------------------------------------------- |
| `SEAT_UNAVAILABLE`         | Seat exists but cannot be booked             |
| `SEAT_NOT_FOUND`           | Seat code does not exist in this venue       |
| `ADJACENCY_RULE_VIOLATION` | Seat selection violates a venue seating rule |

## Adjacency rules

Some venues enforce rules about which seats can be selected together. These are returned with `code: ADJACENCY_RULE_VIOLATION`. The seat itself is available — it is the combination of selected seats that violates the venue's rule. Prompt the customer to adjust their selection.

| Message                                     | What it means                                                           | How to fix                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------- |
| "Selected seats must be consecutive"        | Seats must be next to each other in the same row — no gaps              | Remove the seat causing the gap                             |
| "Left adjacent seat must also be selected"  | Selecting an end seat that would leave a single unsold seat to its left | Also select the seat to the left, or pick a different seat  |
| "Right adjacent seat must also be selected" | Same but to the right                                                   | Also select the seat to the right, or pick a different seat |
| "All seats at the table must be selected"   | For table-style venues, all seats at a table must be booked together    | Select all remaining seats at that table                    |

<ResponseExample>
  ```json 200 (ALL_AVAILABLE) theme={"theme":{"light":"github-light","dark":"github-dark"}}
  {
    "productId": 3023,
    "variantId": 4700,
    "inventoryId": 489560432,
    "currencyCode": "GBP",
    "date": "2026-03-25",
    "startTime": "19:30",
    "seats": [
      {
        "seatCode": "SE-B8223499-CF01-562C-97DC-62F72E232FEC-E-11",
        "sectionName": "Grand Circle",
        "row": "E",
        "seatNumber": "11",
        "seatType": "STANDARD",
        "isAvailable": true,
        "pricing": {
          "currency": "GBP",
          "headoutSellingPrice": 58.43,
          "netPrice": 50.83
        }
      }
    ],
    "validationErrors": []
  }
  ```
</ResponseExample>


## OpenAPI

````yaml POST /api/public/v2/seatmap/products/{productId}/variants/{variantId}/validate/
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
  /api/public/v2/seatmap/products/{productId}/variants/{variantId}/validate/:
    post:
      tags:
        - Seatmap
      summary: Validate - Seatmap
      operationId: validateSeatmapSeats
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: integer
        - name: variantId
          in: path
          required: true
          schema:
            type: integer
        - name: currencyCode
          in: query
          required: false
          schema:
            type: string
          description: ISO 4217 currency code. Defaults to `USD`.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/SeatmapValidateRequest'
      responses:
        '200':
          description: >-
            Validation result. Check validationErrors array even on 200
            responses.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SeatmapValidateResponse'
        '400':
          description: >-
            Seat count violates product minPax/maxPax, exceeds hard ceiling of
            20, `inventoryId` is not an integer, or unknown/malformed request
            body field
        '403':
          description: Partner not authorised, or partner type is Affiliate
        '404':
          description: Product not found or not a seatmap product
        '413':
          description: Request payload too large
        '415':
          description: Content-Type is not application/json
        '503':
          description: >-
            Supplier validation service unavailable. Do not proceed to booking —
            retry the request.
      security:
        - apiKeyAuth: []
components:
  schemas:
    SeatmapValidateRequest:
      type: object
      required:
        - inventoryId
        - seatCodes
      properties:
        inventoryId:
          type: integer
          format: int64
          description: >-
            Show-level inventory identifier. Must be an integer — strings and
            floats are rejected with 400.
        seatCodes:
          type: array
          maxItems: 20
          items:
            type: string
    SeatmapValidateResponse:
      type: object
      properties:
        productId:
          type: integer
        variantId:
          type: integer
        inventoryId:
          type: integer
          format: int64
        currencyCode:
          type: string
        date:
          type: string
          format: date
        startTime:
          type: string
        seats:
          type: array
          items:
            $ref: '#/components/schemas/SeatmapValidatedSeat'
        validationErrors:
          type: array
          description: >-
            Non-empty when one or more seats failed validation. Check this even
            on 200 responses.
          items:
            $ref: '#/components/schemas/SeatmapValidationError'
    SeatmapValidatedSeat:
      type: object
      properties:
        seatCode:
          type: string
        sectionName:
          type:
            - string
            - 'null'
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
        isAvailable:
          type: boolean
        pricing:
          description: Null when isAvailable is false.
          oneOf:
            - $ref: '#/components/schemas/SeatmapPrice'
            - type: 'null'
    SeatmapValidationError:
      type: object
      properties:
        code:
          type: string
          enum:
            - SEAT_UNAVAILABLE
            - SEAT_NOT_FOUND
            - ADJACENCY_RULE_VIOLATION
        message:
          type: string
        seatCode:
          type: string
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
> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# List availabilities - Seatmap

Retrieve seatmap availability for a variant within a date range.

<RequestExample>
  ```bash cURL theme={"theme":{"light":"github-light","dark":"github-dark"}}
  curl --location 'https://www.headout.com/api/public/v2/seatmap/products/3023/variants/4700/availabilities/?currencyCode=GBP&startDate=2026-04-15&endDate=2026-06-14' \
  --header 'Headout-Auth: <YOUR_API_KEY>'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={"theme":{"light":"github-light","dark":"github-dark"}}
  {
    "productId": 3023,
    "variantId": 4700,
    "currencyCode": "GBP",
    "availabilities": [
      {
        "date": "2026-04-15",
        "slots": [
          {
            "startTime": "14:30",
            "pricing": {
              "currency": "GBP",
              "profileType": "PER_PERSON",
              "headoutSellingPrice": 87.5,
              "netPrice": 70.0
            },
            "remaining": 163
          }
        ]
      }
    ]
  }
  ```
</ResponseExample>


## OpenAPI

````yaml specs/openapi-v2-api-partner.yaml GET /api/public/v2/seatmap/products/{productId}/variants/{variantId}/availabilities/
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
  /api/public/v2/seatmap/products/{productId}/variants/{variantId}/availabilities/:
    get:
      tags:
        - Availabilities
      summary: List seatmap availabilities by variant
      operationId: v2ListSeatMapVariantAvailabilities
      parameters:
        - name: productId
          in: path
          required: true
          schema:
            type: integer
          description: Seatmap product ID.
        - name: variantId
          in: path
          required: true
          schema:
            type: integer
          description: Variant ID, which must match the product's primary tour ID.
        - name: currencyCode
          in: query
          required: false
          schema:
            type: string
          description: Currency code for displaying prices. Defaults to `USD` when omitted.
        - name: startDate
          in: query
          required: false
          schema:
            type: string
            format: date
          description: >-
            Beginning of the availability window in `yyyy-MM-dd` format.
            Defaults to today in the tour city timezone.
        - name: endDate
          in: query
          required: false
          schema:
            type: string
            format: date
          description: >-
            End of the availability window in `yyyy-MM-dd` format. Defaults to
            `startDate + 60 days`. The date range cannot exceed 90 days
            inclusive.
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2SeatMapAvailabilityResponse'
        '400':
          description: >-
            Bad request due to missing or invalid query parameters, or when the
            date range exceeds 90 days inclusive.
        '403':
          description: Distribution partner profile is required
        '404':
          description: >-
            Product not found, not seatmap-enabled, missing primary tour, or
            variantId mismatch.
        '500':
          description: Unexpected error while processing the request.
        '503':
          description: Primary tour pricing is temporarily unavailable.
      security:
        - apiKeyAuth: []
components:
  schemas:
    V2SeatMapAvailabilityResponse:
      type: object
      properties:
        productId:
          type: integer
          description: Seatmap product ID from the path parameter.
        variantId:
          type: integer
          description: Primary tour ID backing this seatmap product.
        currencyCode:
          type: string
          description: Resolved currency code used in this response.
        availabilities:
          type: array
          description: >-
            Seatmap availability grouped by date, sorted ascending. Empty when
            no availability is returned for the requested window.
          items:
            $ref: '#/components/schemas/V2SeatMapAvailability'
    V2SeatMapAvailability:
      type: object
      properties:
        date:
          type: string
          format: date
          description: Availability date in `yyyy-MM-dd` format.
        slots:
          type: array
          description: Availability slots for the date, sorted by `startTime` ascending.
          items:
            $ref: '#/components/schemas/V2SeatMapAvailabilitySlot'
    V2SeatMapAvailabilitySlot:
      type: object
      properties:
        startTime:
          type: string
          description: Start time in `HH:mm` format.
        pricing:
          description: Partner pricing payload for this slot.
          allOf:
            - $ref: '#/components/schemas/V2SeatMapPricing'
        remaining:
          type: integer
          description: Remaining inventory for the slot.
    V2SeatMapPricing:
      allOf:
        - $ref: '#/components/schemas/V2SeatMapPricingApiPartner'
      description: >-
        Pricing information for seatmap availability slots. This endpoint always
        returns `profileType: PER_PERSON`.
    V2SeatMapPricingApiPartner:
      title: Seatmap API Partner Pricing
      allOf:
        - $ref: '#/components/schemas/V2SeatMapPricingBase'
        - type: object
          properties:
            netPrice:
              type: number
              format: double
              description: Minimum partner net price.
    V2SeatMapPricingBase:
      type: object
      properties:
        currency:
          type: string
          description: >-
            Currency code (e.g., USD, EUR). Defaults to USD if `currencyCode` is
            not provided in the request. See [Currency
            Codes](/guide/enums-and-error-codes#currency-codes).
        profileType:
          type: string
          enum:
            - PER_PERSON
          description: Seatmap availability is always priced per person.
        headoutSellingPrice:
          type: number
          format: double
          description: Minimum Headout selling price.
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: Headout-Auth

````
> ## Documentation Index
> Fetch the complete documentation index at: https://partner.headout.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.

# Capture a booking

Capture a booking and trigger fulfillment by setting `status` to `PENDING`, and assign your internal `partnerReferenceId` for reconciliation.

This must be called after creating a booking to confirm it. Bookings not captured within one hour are automatically moved to `CAPTURE_TIMEDOUT`.

<RequestExample>
  ```bash cURL theme={"theme":{"light":"github-light","dark":"github-dark"}}
  curl --location --request PUT 'https://www.headout.com/api/public/v2/bookings/126890/' \
  --header 'Headout-Auth: <YOUR_API_KEY>' \
  --header 'Content-Type: application/json' \
  --data '{
    "status": "PENDING",
    "partnerReferenceId": ""
  }'
  ```
</RequestExample>

<ResponseExample>
  ```json 200 theme={"theme":{"light":"github-light","dark":"github-dark"}}
  {
    "bookingId": "126890",
    "partnerReferenceId": "AX67873DDFSR",
    "variantId": "25525",
    "status": "PENDING",
    "startDateTime": "2025-04-12T19:30:00",
    "product": {
      "id": "18969",
      "name": "Bali Swing Experience",
      "variant": {
        "id": "25525",
        "name": "Standard Entry"
      }
    },
    "customersDetails": {
      "count": 1,
      "customers": [
        {
          "personType": "ADULT",
          "isPrimary": true,
          "inputFields": [
            {
              "id": "NAME",
              "name": "Name",
              "value": "John Doe"
            },
            {
              "id": "EMAIL",
              "name": "Email",
              "value": "john@example.com"
            },
            {
              "id": "PHONE",
              "name": "Phone",
              "value": "+14155551234"
            }
          ]
        }
      ]
    },
    "seatInfo": null,
    "variantInputFields": [],
    "price": {
      "amount": 77.08,
      "currencyCode": "USD"
    },
    "creationTimestamp": 1712953295,
    "voucherUrl": "https://www.headout.com/voucher/126890?key=AAAD6AAAABhsDVGl...",
    "tickets": [
      {
        "publicId": "9e4d8330-abc7-40f8-951d-19b9e8731dcf",
        "url": null,
        "type": "QRCODE"
      }
    ]
  }
  ```
</ResponseExample>


## OpenAPI

````yaml PUT /api/public/v2/bookings/{bookingId}/
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
  /api/public/v2/bookings/{bookingId}/:
    put:
      tags:
        - Bookings
      summary: Capture a booking
      operationId: v2UpdateBooking
      parameters:
        - name: bookingId
          in: path
          required: true
          schema:
            type: string
          description: The booking ID to capture.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/V2BookingUpdate'
      responses:
        '200':
          description: Booking captured successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/V2Booking'
        '400':
          description: Invalid booking ID or booking is not in UNCAPTURED state
        '403':
          description: Booking does not belong to the authenticated partner
      security:
        - apiKeyAuth: []
components:
  schemas:
    V2BookingUpdate:
      type: object
      required:
        - status
        - partnerReferenceId
      properties:
        status:
          type: string
          description: Set to `PENDING` to capture the booking and trigger fulfillment.
          enum:
            - PENDING
        partnerReferenceId:
          type: string
          description: >-
            Your internal reference ID for this booking (e.g., your order
            number). This field is required, cannot be `null`, and may be an
            empty string if you do not want to set a partner reference ID.
            Otherwise, provide your partner reference ID.
    V2Booking:
      type: object
      properties:
        bookingId:
          type: string
          description: >-
            Headout's unique identifier for this booking. Use this for all
            subsequent operations (capture, cancel, reschedule).
        partnerReferenceId:
          type:
            - string
            - 'null'
          description: >-
            Your own reference ID for this booking, set when capturing via
            [Update Booking](/api-partner/v2/bookings/update).
        variantId:
          type: string
          description: The variant (tour option) that was booked.
        status:
          type: string
          description: >-
            Current lifecycle state of the booking. See [Booking
            Status](/guide/enums-and-error-codes#booking-status).

            - `UNCAPTURED`: Created but not yet captured. Does not lock
            inventory or price. Auto-expires to `CAPTURE_TIMEDOUT` after 1 hour.

            - `PENDING`: Payment captured — confirmed with supplier. Treat as
            confirmed; show to the customer as a confirmed booking.

            - `COMPLETED`: Fulfilled — tickets are available in the `tickets`
            array.

            - `CANCELLED`: Cancelled by partner, customer, or Headout.

            - `FAILED`: Booking failed due to a payment or system error.

            - `CAPTURE_TIMEDOUT`: Not captured within 1 hour of creation; can no
            longer be captured.
          enum:
            - UNCAPTURED
            - PENDING
            - COMPLETED
            - CANCELLED
            - FAILED
            - CAPTURE_TIMEDOUT
        startDateTime:
          type: string
          format: date-time
          description: >-
            Scheduled start time for the experience in local time, with no
            timezone offset (format `yyyy-MM-dd'T'HH:mm:ss`).
        product:
          type: object
          description: Summary of the product and variant booked.
          properties:
            id:
              type: string
              description: Headout product ID.
            name:
              type: string
              description: Display name of the product.
            variant:
              type: object
              description: The specific variant that was booked.
              properties:
                id:
                  type: string
                  description: Headout variant ID.
                name:
                  type: string
                  description: Display name of the variant.
        customersDetails:
          type: object
          description: All customers included in this booking.
          properties:
            count:
              type: integer
              description: Total number of customers across all person types.
            customers:
              type: array
              items:
                type: object
                properties:
                  personType:
                    type: string
                    description: >-
                      Pricing category for this customer (e.g., `ADULT`,
                      `CHILD`, `SENIOR`).
                  isPrimary:
                    type: boolean
                    description: Whether this is the lead customer for the booking.
                  inputFields:
                    type: array
                    items:
                      type: object
                      properties:
                        id:
                          type: string
                          description: >-
                            Field identifier (e.g., `NAME`, `EMAIL`, `PHONE`, or
                            `CUSTOM_*`).
                        name:
                          type: string
                          description: Human-readable label for this field.
                        value:
                          type: string
                          description: The submitted value for this field.
        variantInputFields:
          type:
            - array
            - 'null'
          items:
            type: object
            properties:
              id:
                type: string
                description: >-
                  Field identifier for a booking-level field defined on the
                  variant (e.g., `PICKUP_LOCATION`, `LANGUAGE_`).
              name:
                type: string
                description: Human-readable label for this field.
              value:
                type: string
                description: The submitted value for this field.
          description: Booking-level input fields applicable to the whole booking.
        price:
          type: object
          description: Total price paid for this booking.
          properties:
            amount:
              type: number
              format: double
              description: Total price amount for all customers combined.
            currencyCode:
              type: string
              description: >-
                Currency code for the price amount. See [Currency
                Codes](/guide/enums-and-error-codes#currency-codes).
        voucherUrl:
          type: string
          description: >-
            URL to the booking voucher PDF. Available once the booking reaches
            `PENDING` or `COMPLETED` status.
        tickets:
          type:
            - array
            - 'null'
          items:
            type: object
            description: >-
              Individual tickets associated with this booking. Populated after
              successful fulfillment.
            properties:
              publicId:
                type: string
                description: >-
                  Unique identifier for this ticket, usable for support and
                  lookup.
              url:
                type:
                  - string
                  - 'null'
                description: >-
                  URL for the ticket. Present for `PDF_URL`, `HTML_URL`,
                  `APPLE_WALLET_URL`, and `GOOGLE_WALLET_URL` types. Null for
                  `QRCODE`, `BARCODE`, and `TEXT` types.
              type:
                type: string
                enum:
                  - PDF_URL
                  - HTML_URL
                  - QRCODE
                  - BARCODE
                  - TEXT
                  - APPLE_WALLET_URL
                  - GOOGLE_WALLET_URL
                description: Ticket delivery format.
        seatInfo:
          type:
            - array
            - 'null'
          description: >-
            Seat assignment details for seatmap-based products. Null for
            non-seatmap products.
          items:
            type: object
            properties:
              section:
                type: string
                description: >-
                  Section name within the venue (e.g., "Orchestra",
                  "Mezzanine").
              row:
                type: string
                description: Row identifier within the section.
              seatNumber:
                type: string
                description: Seat number within the row.
              seatCode:
                type: string
                description: Unique code identifying the specific seat.
        creationTimestamp:
          type: integer
          format: int64
          description: Unix epoch timestamp (seconds) when this booking was first created.
  securitySchemes:
    apiKeyAuth:
      type: apiKey
      in: header
      name: Headout-Auth

````
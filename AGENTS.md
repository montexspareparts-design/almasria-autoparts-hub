# Architecture decisions

- Oil checkout may delete only the signed-in customer's unpaid orders; this allows failed item insertion cleanup without exposing paid orders.
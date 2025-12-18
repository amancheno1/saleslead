/*
  # Agregar campos para pagos a plazos

  1. Cambios en la tabla `leads`
    - `installment_count` (integer) - Número de plazos (2 o 3)
    - `initial_payment` (numeric) - Importe inicial pagado en caso de pago a plazos
  
  2. Notas
    - Estos campos serán opcionales y solo se usarán cuando payment_method sea "Pago a plazos"
    - Se mantiene la compatibilidad con los datos existentes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'installment_count'
  ) THEN
    ALTER TABLE leads ADD COLUMN installment_count integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'initial_payment'
  ) THEN
    ALTER TABLE leads ADD COLUMN initial_payment numeric(10,2);
  END IF;
END $$;
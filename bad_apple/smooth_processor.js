console.log('[smooth_signal_processor.js] Początek pliku.');
// smooth_signal_processor.js
class smooth_signal_processor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    // Inicjalizuj jako pustą tablicę, stan będzie zarządzany w 'process'
    this.current_values = [];

    // Odczytaj wagi, podaj domyślne wartości na wypadek braku opcji
    this.current_weight = options?.processorOptions?.current_weight ?? 0.8;
    this.target_weight = options?.processorOptions?.target_weight ?? 0.2;

    // Oblicz sumę wag raz
    this.total_weight = this.current_weight + this.target_weight;

      // === LOGOWANIE DIAGNOSTYCZNE ===
      console.log('[smooth_signal_processor] Constructed. Received options:', options);
      console.log(`[smooth_signal_processor] Weights: current=${this.current_weight}, target=${this.target_weight}, total=${this.total_weight}`);
      // === KONIEC LOGOWANIA ===

    // Zabezpieczenie przed dzieleniem przez zero, jeśli obie wagi to 0
    if (this.total_weight === 0) {
        console.warn("[smooth_signal_processor] Total weight is zero! Setting weights to pass through (target_weight=1).");
        // Ustawienie wag tak, aby sygnał przechodził bez zmian (output = target)
        this.current_weight = 0;
        this.target_weight = 1;
        this.total_weight = 1;
    } else if (!isFinite(this.total_weight) || !isFinite(this.current_weight) || !isFinite(this.target_weight)) {
        console.error("[smooth_signal_processor] Weights are not finite! Setting weights to pass through.");
        this.current_weight = 0;
        this.target_weight = 1;
        this.total_weight = 1;
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    // Podstawowe zabezpieczenia
    if (!input || !output || input.length === 0 || output.length === 0) {
      // console.warn('[smooth_signal_processor] No valid input/output buffers.');
      return true; // Nic do zrobienia, utrzymuj procesor przy życiu
    }

    const numChannels = Math.min(input.length, output.length);
    const numSamples = input[0]?.length ?? 0; // Zakładamy stałą długość bloku

    if (numSamples === 0) {
         // console.warn('[smooth_signal_processor] Input buffer has zero samples.');
         return true; // Nic do zrobienia
    }


    // === Zarządzanie Stanem (current_values) ===
    // Dostosuj rozmiar tablicy this.current_values do liczby kanałów, jeśli jest to konieczne
    if (this.current_values.length !== numChannels) {
      const old_values = this.current_values;
      this.current_values = new Array(numChannels);
      console.log(`[smooth_signal_processor] Adjusting channel count from ${old_values.length} to ${numChannels}.`);
      for (let c = 0; c < numChannels; ++c) {
        if (c < old_values.length && isFinite(old_values[c])) {
          this.current_values[c] = old_values[c]; // Zachowaj stary stan, jeśli poprawny
        } else {
          // Zainicjuj pierwszą wartością z wejścia (jeśli istnieje i jest poprawna) lub 0
          const initialValue = input[c]?.[0];
          this.current_values[c] = isFinite(initialValue) ? initialValue : 0;
          console.log(`[smooth_signal_processor] Initialized channel ${c} state to ${this.current_values[c]}`);
        }
      }
    }
    // === Koniec Zarządzania Stanem ===

    // Przetwarzanie każdego kanału
    for (let channel = 0; channel < numChannels; ++channel) {
      const input_channel_data = input[channel];
      const output_channel_data = output[channel];

      // Sprawdzenie poprawności danych kanału
      if (!input_channel_data || !output_channel_data || input_channel_data.length !== numSamples) {
          console.warn(`[smooth_signal_processor] Invalid data or length mismatch for channel ${channel}. Skipping.`);
          if (output_channel_data) output_channel_data.fill(0); // Wyzeruj wyjście dla bezpieczeństwa
          continue;
      }

      // Pobierz stan dla bieżącego kanału
      let current_sm_value = this.current_values[channel];

      // Sprawdź, czy pobrany stan jest poprawną liczbą
      if (!isFinite(current_sm_value)) {
          console.warn(`[smooth_signal_processor] Invalid state detected for channel ${channel} (${current_sm_value}). Resetting to first input.`);
          const initialValue = input_channel_data[0];
          current_sm_value = isFinite(initialValue) ? initialValue : 0;
      }

      // Przetwarzanie każdej próbki w bloku
      for (let i = 0; i < numSamples; ++i) {
        const target_value = input_channel_data[i];

        // Sprawdź, czy wartość docelowa jest poprawną liczbą
        if (!isFinite(target_value)) {
            console.warn(`[smooth_signal_processor] Invalid target value at index ${i}, channel ${channel}. Using previous smoothed value.`);
            output_channel_data[i] = current_sm_value; // Użyj ostatniej znanej dobrej wartości
            continue; // Pomiń obliczenia dla tej próbki
        }

        // === Formuła Wygładzania ===
        current_sm_value = (this.current_weight * current_sm_value + this.target_weight * target_value) / this.total_weight;

        // Sprawdź wynik obliczeń
        if (!isFinite(current_sm_value)) {
            console.error("[smooth_signal_processor] Calculation resulted in non-finite value! Resetting to target.");
            current_sm_value = target_value; // W przypadku błędu, wróć do wartości wejściowej
        }
        // === Koniec Formuły ===

        output_channel_data[i] = current_sm_value;
      }

      // Zapisz ostatnią obliczoną wartość jako stan dla następnego bloku
      this.current_values[channel] = current_sm_value;
    }

    return true; // Utrzymaj procesor przy życiu
  }
}

registerProcessor('smooth_signal_processor', smooth_signal_processor);
console.log('[smooth_signal_processor.js] File loaded and processor registered.'); // Potwierdzenie załadowania pliku
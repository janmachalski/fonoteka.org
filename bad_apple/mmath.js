// mmath.js

/**
 * Given two resultant combination tones f_1 and f_2, this function calculates a pair of tones that create those combination tones
 *
 * @param {number} f_1 The first frequency in Hz.
 * @param {number} f_2 The second frequency in Hz.
 * @returns {number[]} An array containing the calculated tone pair [tone_a, tone_b].
 */
function combination_tone_pair(f_1, f_2) {
  const tone_a = f_1 + f_2;
  const tone_b = 2 * f_1 + f_2;
  return [tone_a, tone_b];
}

/**
 * Funkcja przekształcająca tablicę strojów poprzez odbicie lustrzane
 * @param {Array<number>} tuning_array_src - Źródłowa tablica strojów
 * @param {number} size - Rozmiar tablicy
 * @param {number} interval_of_equivalence - Interwał ekwiwalencji
 * @returns {Array<number>} - Przekształcona tablica strojów
 */
function mirror_scale(tuning_array_src, size, interval_of_equivalence) {
    const tuning_array_dest = new Array(size);
    tuning_array_dest[0] = 1.0 / tuning_array_src[0];
    
    // Dla każdego kolejnego elementu obliczamy odwrócony interwał
    for (let i = 1; i < size; i++) {
        // Obliczamy odwrócony interwał jako interwał okresu podzielony przez
        // odpowiedni element oryginalnej skali, licząc od końca
        tuning_array_dest[i] = interval_of_equivalence / tuning_array_src[size - i];
    }
    
    return tuning_array_dest;
}

/**
 * Oblicza zasadę struktury na podstawie tablicy struktury harmonicznej
 * @param {Array<number>} struktura_harmoniczna - Tablica struktury harmonicznej
 * @param {number} size - Rozmiar tablicy
 * @returns {number} - Obliczona zasada struktury
 */
function oblicz_zasade_struktury(struktura_harmoniczna, size) {
    let zasada_struktury = 0.0;
    for (let i = 0; i < size; i++) {
        zasada_struktury += struktura_harmoniczna[i];
    }
    return zasada_struktury;
}

/**
 * Tworzy strukturę przeciwną dla podanej struktury harmonicznej
 * @param {Array<number>} struktura_harmoniczna_src - Źródłowa struktura harmoniczna
 * @param {number} size - Rozmiar tablicy
 * @returns {Array<number>} - Struktura przeciwna
 */
function struktura_przeciwna(struktura_harmoniczna_src, size) {
    // Kopiowanie źródła do nowej tablicy
    const struktura_harmoniczna_dest = [...struktura_harmoniczna_src];
    
    // Odwrócenie tablicy
    for (let i = 0; i < Math.floor(size/2); i++) {
        const temp = struktura_harmoniczna_dest[i];
        struktura_harmoniczna_dest[i] = struktura_harmoniczna_dest[size - 1 - i];
        struktura_harmoniczna_dest[size - 1 - i] = temp;
    }
    
    // Znajdź indeks największej liczby
    let index_of_the_highest_number = 0;
    for (let i = 0; i < size; i++) {
        if (struktura_harmoniczna_dest[i] > struktura_harmoniczna_dest[index_of_the_highest_number]) {
            index_of_the_highest_number = i;
        }
    }
    
    // Przypisz indeksowi 0 największy interwał
    const temp_array = new Array(size);
    
    for (let i = 0; i < size; i++) {
        temp_array[i] = struktura_harmoniczna_dest[(index_of_the_highest_number + i) % size];
    }
    
    for (let i = 0; i < size; i++) {
        struktura_harmoniczna_dest[i] = temp_array[i];
    }
    
    return struktura_harmoniczna_dest;
}

/**
 * Tworzy strukturę odbitą dla podanej struktury harmonicznej
 * @param {Array<number>} struktura_harmoniczna_src - Źródłowa struktura harmoniczna
 * @param {number} size - Rozmiar tablicy
 * @returns {Array<number>} - Struktura odbita
 */
function struktura_odbita(struktura_harmoniczna_src, size) {
    const struktura_harmoniczna_dest = new Array(size);
    
    // Oblicz sumę
    const zasada_struktury = oblicz_zasade_struktury(struktura_harmoniczna_src, size);
    
    const podwojony_skladnik_struktury_rownomiernej = 2.0 * (zasada_struktury / size);
    
    for (let i = 0; i < size; i++) {
        struktura_harmoniczna_dest[i] = podwojony_skladnik_struktury_rownomiernej - struktura_harmoniczna_src[i];
    }
    
    return struktura_harmoniczna_dest;
}

/**
 * Konwertuje notację stroju z równoległej na szeregową
 * @param {Array<number>} tuning_array_src - Źródłowa tablica strojów
 * @param {number} size - Rozmiar tablicy
 * @returns {Array<number>} - Przekształcona tablica strojów
 */
function convert_tuning_notation_from_parallel_to_serial(tuning_array_src, size) {
    const tuning_array_dest = new Array(size);
    
    if (size > 1) {
        tuning_array_dest[0] = tuning_array_src[0];
        for (let i = 1; i < size; i++) {
            tuning_array_dest[i] = tuning_array_src[i] - tuning_array_src[i - 1];
        }
    } else if (size === 1) {
        tuning_array_dest[0] = tuning_array_src[0];
    }
    
    return tuning_array_dest;
}

/**
 * Konwertuje notację stroju z szeregowej na równoległą
 * @param {Array<number>} tuning_array_src - Źródłowa tablica strojów
 * @param {number} size - Rozmiar tablicy
 * @returns {Array<number>} - Przekształcona tablica strojów
 */
function convert_tuning_notation_from_serial_to_parallel(tuning_array_src, size) {
    const tuning_array_dest = new Array(size);
    
    if (size > 0) {
        tuning_array_dest[0] = tuning_array_src[0];
        for (let i = 1; i < size; i++) {
            tuning_array_dest[i] = tuning_array_dest[i - 1] + tuning_array_src[i];
        }
    }
    
    return tuning_array_dest;
}

/**
 * Oblicza silnię na podstawie stosunków epimorycznych
 * @param {number} integer - Liczba całkowita, dla której obliczamy silnię
 * @returns {number} - Obliczona silnia
 */
function factorial_epimoric(integer) {
    let sum = 0.0;
    // Implementacja równania f(x) = exp(sum_{k=1}^{x} (x-k) * ln((k+1)/k))
    for (let k = 1; k <= integer; k++) {
        const exponent = integer - k;
        const log_k = Math.log(k);
        const log_k_plus_one = Math.log(k + 1.0);
        const term = exponent * log_k_plus_one - exponent * log_k;
        sum += term;
    }
    return Math.exp(sum);
}

/**
 * Funkcja testowa dla factorial_epimoric
 */
function test_factorial_epimoric() {
    const test_values = [1, 2, 3, 4, 5, 10];
    
    console.log("Test funkcji factorial_epimoric:");
    console.log("-------------------------------");
    
    for (let i = 0; i < test_values.length; i++) {
        const n = test_values[i];
        const result = factorial_epimoric(n);
        
        // Porównanie z wartością silni
        let factorial = 1.0;
        for (let j = 1; j <= n; j++) {
            factorial *= j;
        }
        
        console.log(`n = ${n}:`);
        console.log(`  Wynik funkcji: ${result.toFixed(15)}`);
        console.log(`  Faktyczna silnia: ${factorial.toFixed(15)}`);
        console.log(`  Błąd względny: ${Math.abs(result - factorial) / factorial.toExponential(15)}\n`);
    }
}

/**
 * Sortuje tablicę od najmniejszego do największego elementu
 * @param {Array<number>} source_array - Źródłowa tablica
 * @param {number} array_size - Rozmiar tablicy
 * @returns {Array<number>} - Posortowana tablica
 */
function array_sort(source_array, array_size) {
    // Kopiowanie wartości z tablicy źródłowej do docelowej
    const dest_array = [...source_array];
    
    // Zastosowanie algorytmu insertion sort, który jest efektywny dla małych tablic
    for (let i = 1; i < array_size; i++) {
        const key = dest_array[i];
        let j = i - 1;
        
        // Przesuwanie elementów większych od key o jedną pozycję do przodu
        while (j >= 0 && dest_array[j] > key) {
            dest_array[j + 1] = dest_array[j];
            j = j - 1;
        }
        dest_array[j + 1] = key;
    }
    
    return dest_array;
}

/**
 * Generuje skalę na podstawie okresu i generatora
 * @param {number} number_of_pitch_classes - Liczba klas wysokości dźwięku
 * @param {number} period - Okres
 * @param {number} generator - Generator
 * @returns {Array<number>} - Wygenerowana skala
 */
function scalesmith_period_and_generator(number_of_pitch_classes, period, generator) {
    const temp_array = new Array(number_of_pitch_classes);

    for (let i = 0; i < number_of_pitch_classes; i++) {
        let interval = Math.pow(generator, i);

        if (period > 0.0) {
            while (interval >= period) { interval /= period; }
            while (interval < 0.0) { interval *= period; }
        }
        temp_array[i] = interval;
    }
    
    // Sortowanie tablicy wynikowej od najmniejszego do największego elementu
    return array_sort(temp_array, number_of_pitch_classes);
}

/**
 * Generuje skalę według metody Euler-Fokker
 * @param {number} num_of_generators - Liczba generatorów
 * @param {Array<number>} generators - Tablica generatorów
 * @param {boolean} remove_duplicate_steps - Czy usuwać duplikaty
 * @returns {Object} - Obiekt zawierający tablicę strojów i liczbę klas wysokości
 */
function scalesmith_euler_fokker_genus(generators, num_of_generators, remove_duplicate_steps) {
    const total_num_of_steps = Math.pow(2, num_of_generators);
    const calc_array = new Array(total_num_of_steps);
    
    // Wygeneruj wszystkie kombinacje generatorów
    for (let iter = 0; iter < total_num_of_steps; iter++) {
        calc_array[iter] = 1.0; // Początkowa wartość jako proporcja
        for (let bit_shift = 0; bit_shift < num_of_generators; bit_shift++) {
            if ((iter >> bit_shift) & 1) {
                calc_array[iter] *= generators[bit_shift];
            }
        }
        
        // Zredukuj do oktawy
        if (calc_array[iter] > 0.0) {
            while (calc_array[iter] >= 2.0) { calc_array[iter] /= 2.0; }
            while (calc_array[iter] < 1.0) { calc_array[iter] *= 2.0; }
        }
    }
    
    // Obsługa duplikatów w zależności od parametru remove_duplicate_steps
    if (remove_duplicate_steps) {
        // Wykrywanie i usuwanie duplikatów
        const temp_array = [];
        let is_duplicate;
        
        for (let i = 0; i < total_num_of_steps; i++) {
            is_duplicate = false;
            for (let j = 0; j < temp_array.length; j++) {
                if (Math.abs(calc_array[i] - temp_array[j]) < 0.001) {
                    is_duplicate = true;
                    break;
                }
            }
            
            if (!is_duplicate) {
                temp_array.push(calc_array[i]);
            }
        }

        return {
            tuning_array: array_sort(temp_array, temp_array.length),
            number_of_pitch_classes: temp_array.length
        };
    } else {
        return {
            tuning_array: array_sort(calc_array, total_num_of_steps),
            number_of_pitch_classes: total_num_of_steps
        };
    }
}

/**
 * Generuje skalę na podstawie kombinacji produktów
 * @param {Array<number>} generators - Tablica generatorów
 * @param {number} num_of_generators - Liczba generatorów
 * @param {number} num_of_elements_in_combination - Liczba elementów w kombinacji
 * @param {number} index_of_reduction_generator - Indeks generatora redukcji
 * @param {boolean} remove_duplicate_steps - Czy usuwać duplikaty
 * @returns {Object} - Obiekt zawierający tablicę strojów i liczbę klas wysokości
 */
function scalesmith_combination_product_set(generators, num_of_generators, 
                                          num_of_elements_in_combination, 
                                          index_of_reduction_generator, 
                                          remove_duplicate_steps) {
    
    const max_combinations = Math.pow(2, num_of_generators);
    const calc_array = [];
    
    // Generowanie kombinacji o zadanej liczbie elementów
    for (let iter = 0; iter < max_combinations; iter++) {
        let bit_sum = 0;
        
        // Sprawdź, czy liczba ustawionych bitów jest równa num_of_elements_in_combination
        for (let bit_shift = 0; bit_shift < num_of_generators; bit_shift++) {
            if ((iter >> bit_shift) & 1) {
                bit_sum++;
            }
        }
        
        if (bit_sum === num_of_elements_in_combination) {
            let value = 1.0; // Początkowa wartość jako proporcja
            
            // Oblicz iloczyn proporcji dla wybranej kombinacji
            for (let bit_shift = 0; bit_shift < num_of_generators; bit_shift++) {
                if ((iter >> bit_shift) & 1) {
                    value *= generators[bit_shift];
                }
            }
            
            calc_array.push(value);
        }
    }
    
    // Redukcja względem generatora o indeksie index_of_reduction_generator
    const reduction_value = calc_array[index_of_reduction_generator];
    
    for (let i = 0; i < calc_array.length; i++) {
        calc_array[i] = calc_array[i] / reduction_value;
        
        // Redukcja do oktawy
        if (calc_array[i] > 0.0) {
            while (calc_array[i] > 2.0) { calc_array[i] /= 2.0; }
            while (calc_array[i] < 1.0) { calc_array[i] *= 2.0; }
        }
    }
    
    // Obsługa duplikatów w zależności od parametru remove_duplicate_steps
    if (remove_duplicate_steps) {
        // Wykrywanie i usuwanie duplikatów
        const temp_array = [];
        let is_duplicate;
        
        for (let i = 0; i < calc_array.length; i++) {
            is_duplicate = false;
            for (let j = 0; j < temp_array.length; j++) {
                if (Math.abs(calc_array[i] - temp_array[j]) < 0.001) {
                    is_duplicate = true;
                    break;
                }
            }
            
            if (!is_duplicate) {
                temp_array.push(calc_array[i]);
            }
        }
        
        return {
            tuning_array: array_sort(temp_array, temp_array.length),
            number_of_pitch_classes: temp_array.length
        };
    } else {
        return {
            tuning_array: array_sort(calc_array, calc_array.length),
            number_of_pitch_classes: calc_array.length
        };
    }
}

/**
 * Funkcja testowa dla funkcji scalesmith
 */
function test_scalesmith_functions() {
    // Test 1: Euler-Fokker genus
    console.log("Test 1: Euler-Fokker genus");
    
    // Przykładowe generatory: oktawa, kwinta i tercja wielka
    const generators = [2.0, 3.0, 5.0];
    
    const result1 = scalesmith_euler_fokker_genus(generators, 3, true);
    
    console.log(`Number of pitch classes: ${result1.number_of_pitch_classes}`);
    console.log("Tuning array values:");
    for (let i = 0; i < result1.number_of_pitch_classes; i++) {
        console.log(`${i}: ${result1.tuning_array[i].toFixed(2)}`);
    }
    
    // Test 2: Period and generator
    console.log("\nTest 2: Period and generator");
    
    const period = 2.0;     // Oktawa
    const generator = 3.0;   // Kwinta
    const test_num_pitch_classes = 12; // Pythagorean tuning
    
    const result2 = scalesmith_period_and_generator(test_num_pitch_classes, period, generator);
    
    console.log(`Number of pitch classes: ${test_num_pitch_classes}`);
    console.log("Tuning array values:");
    for (let i = 0; i < test_num_pitch_classes; i++) {
        console.log(`${i}: ${result2[i].toFixed(2)}`);
    }
    
    // Test 3: Combination product set
    console.log("\nTest 3: Combination product set");
    
    const result3 = scalesmith_combination_product_set(generators, 3, 2, 0, false);
    
    console.log(`Number of pitch classes: ${result3.number_of_pitch_classes}`);
    console.log("Tuning array values:");
    for (let i = 0; i < result3.number_of_pitch_classes; i++) {
        console.log(`${i}: ${result3.tuning_array[i].toFixed(2)}`);
    }
}

/**
 * Oblicza częstotliwość n-tego stopnia skali
 * @param {number} step - Indeks kroku w skali przed transpozycją
 * @param {Array<number>} tuning - Tablica proporcji stroju muzycznego
 * @param {number} length - Ilość stopni w skali wewnątrz equave
 * @param {number} equave - Interwał ekwiwalencji
 * @param {number} kamerton - Wysokość referencyjna
 * @param {number} tonic_transposition - Transpozycja stroju
 * @returns {number} - Obliczona częstotliwość w Hz
 */
function get_nth_step(step, tuning, length, equave, kamerton, tonic_transposition) {
    const transposed_step = step - Math.round(length * (Math.log(tonic_transposition) / Math.log(equave)));
    const target_equave = Math.floor(transposed_step / length);
    const target_step = Math.trunc(transposed_step - target_equave * length);
    
    return kamerton * tuning[target_step] * Math.pow(equave, target_equave) * tonic_transposition;
}

/**
 * Oblicza częstotliwość dla danego interwału muzycznego
 * @param {number} interval - Interwał muzyczny
 * @param {Array<number>} tuning - Tablica proporcji stroju muzycznego
 * @param {number} length - Ilość stopni w skali
 * @param {number} equave - Interwał ekwiwalencji
 * @param {number} kamerton - Wysokość referencyjna
 * @param {number} tonic_transposition - Transpozycja stroju
 * @returns {number} - Obliczona częstotliwość w Hz
 */
function get_pitch(interval, tuning, length, equave, kamerton, tonic_transposition) {
    const transposed_step = length * (Math.log(interval) / Math.log(equave)) - 
                           Math.round(length * (Math.log(tonic_transposition) / Math.log(equave)));

    const target_equave = Math.floor(transposed_step / length);
    const target_step = Math.trunc(transposed_step - target_equave * length);
    
    return kamerton * tuning[target_step] * Math.pow(equave, target_equave) * tonic_transposition;
}

/**
 * Generuje temperament na podstawie podanych parametrów
 * @param {number} number_of_pitch_classes - Liczba klas wysokości dźwięku
 * @param {Array<number>} temperament_units - Jednostki temperamentu
 * @param {number} period - Okres
 * @param {number} generator - Generator
 * @param {number} comma - Komma
 * @returns {Array<number>} - Wygenerowany temperament
 */
function generate_temperament(number_of_pitch_classes, temperament_units, period, generator, comma) {
    // Tablica tymczasowa do obliczeń
    const temp_array = new Array(number_of_pitch_classes);
    
    // Obliczenie sumy elementów tablicy temperament_units
    let temperament_units_base = 0.0;
    for (let i = 0; i < number_of_pitch_classes; i++) {
        temperament_units_base += temperament_units[i];
    }
    console.log(`   temperament_units_base = ${temperament_units_base.toFixed(1)}`);
    
    // Ustawienie pierwszego elementu tablicy tymczasowej
    temp_array[0] = 1.0;
    
    // Generacja wartości dla pozostałych elementów
    for (let i = 1; i < number_of_pitch_classes; i++) {
        // Obliczenie kroku na podstawie poprzedniej wartości
        const calc_step = temp_array[i-1] * generator;
        
        // Obliczenie temperamentu
        const temper_amount = Math.pow(comma, temperament_units[i] / temperament_units_base);
        
        // Temperowany krok
        const tempered_step = calc_step / temper_amount;
        
        // Redukcja do odpowiedniego zakresu
        let reduced_step = tempered_step;
        
        // Redukcja w dół, jeśli wartość jest większa niż okres
        while (reduced_step >= period) {
            reduced_step /= period;
        }
        
        // Zwiększenie, jeśli wartość jest mniejsza niż 1.0
        while (reduced_step < 1.0) {
            reduced_step *= period;
        }
        
        // Zapisanie do tablicy tymczasowej
        temp_array[i] = reduced_step;
    }
    
    // Sortowanie tablicy tymczasowej według wartości absolutnych
    return array_sort(temp_array, number_of_pitch_classes);
}

/**
 * Funkcja testowa dla funkcji mikrotonalnych
 */
function test_microtonal_functions() {
    console.log("Test funkcji do obliczeń harmonii mikrotonalnych");
    console.log("================================================\n");
    
    // Zdefiniowane parametry testowe
    const test_tonic_transposition = 1.0;
    const kamerton = 440.0;
    
    // Strój 12-tonowy równomiernie temperowany
    const equal_temperament = [
        1.0, 
        Math.pow(2.0, 1.0/12.0),
        Math.pow(2.0, 2.0/12.0),
        Math.pow(2.0, 3.0/12.0),
        Math.pow(2.0, 4.0/12.0),
        Math.pow(2.0, 5.0/12.0),
        Math.pow(2.0, 6.0/12.0),
        Math.pow(2.0, 7.0/12.0),
        Math.pow(2.0, 8.0/12.0),
        Math.pow(2.0, 9.0/12.0),
        Math.pow(2.0, 10.0/12.0),
        Math.pow(2.0, 11.0/12.0)
    ];
    
    // Strój Bohlen-Pierce (podział trytawy 3.0 na 13 części)
    const bohlen_pierce = [
        1.0,
        Math.pow(3.0, 1.0/13.0),
        Math.pow(3.0, 2.0/13.0),
        Math.pow(3.0, 3.0/13.0),
        Math.pow(3.0, 4.0/13.0),
        Math.pow(3.0, 5.0/13.0),
        Math.pow(3.0, 6.0/13.0),
        Math.pow(3.0, 7.0/13.0),
        Math.pow(3.0, 8.0/13.0),
        Math.pow(3.0, 9.0/13.0),
        Math.pow(3.0, 10.0/13.0),
        Math.pow(3.0, 11.0/13.0),
        Math.pow(3.0, 12.0/13.0)
    ];

    let result;
    
    // 1. Test get_nth_step dla stroju równomiernie temperowanego
    console.log("1. Test get_nth_step dla stroju 12-tonowego równomiernie temperowanego:");
    console.log(`   tuning = equal_temperament, length = 12, equave = 2.0, kamerton = ${kamerton.toFixed(1)}, tonic_transposition = ${test_tonic_transposition.toFixed(1)}`);
    
    for (let i = 0; i <= 12; i++) {
        result = get_nth_step(i, equal_temperament, 12, 2.0, kamerton, test_tonic_transposition);
        console.log(`   step = ${i.toString().padStart(2)}: ${result.toFixed(2)} Hz`);
    }
    
    // 2. Test get_pitch dla stroju równomiernie temperowanego
    console.log("\n2. Test get_pitch dla stroju 12-tonowego równomiernie temperowanego:");
    console.log(`   tuning = equal_temperament, length = 12, equave = 2.0, kamerton = ${kamerton.toFixed(1)}, tonic_transposition = ${test_tonic_transposition.toFixed(1)}`);
    
    for (let i = 0; i <= 10; i++) {
        const interval = 1.0 + (i * 0.1);
        result = get_pitch(interval, equal_temperament, 12, 2.0, kamerton, test_tonic_transposition);
        console.log(`   interval = ${interval.toFixed(1)}: ${result.toFixed(2)} Hz`);
    }
    
    // 3. Test get_nth_step dla stroju Bohlen-Pierce
    console.log("\n3. Test get_nth_step dla stroju Bohlen-Pierce:");
    console.log(`   tuning = bohlen_pierce, length = 13, equave = 3.0, kamerton = ${kamerton.toFixed(1)}, tonic_transposition = ${test_tonic_transposition.toFixed(1)}`);
    
    for (let i = 0; i <= 12; i++) {
        result = get_nth_step(i, bohlen_pierce, 13, 3.0, kamerton, test_tonic_transposition);
        console.log(`   step = ${i.toString().padStart(2)}: ${result.toFixed(2)} Hz`);
    }
    
    // 4. Test get_pitch dla stroju Bohlen-Pierce
    console.log("\n4. Test get_pitch dla stroju Bohlen-Pierce:");
    console.log(`   tuning = bohlen_pierce, length = 13, equave = 3.0, kamerton = ${kamerton.toFixed(1)}, tonic_transposition = ${test_tonic_transposition.toFixed(1)}`);
    
    for (let i = 0; i <= 10; i++) {
        const interval = 1.0 + (i * 0.1);
        result = get_pitch(interval, bohlen_pierce, 13, 3.0, kamerton, test_tonic_transposition);
        console.log(`   interval = ${interval.toFixed(1)}: ${result.toFixed(2)} Hz`);
    }
    
    console.log("\n5. Test temperament units:");
    const temperament_units = new Array(12).fill(-60.0);
    
    // Wywołanie funkcji
    const tu_destination = generate_temperament(12, temperament_units, 2.0, 3.0/2.0, 531441.0/524288.0);
    
    // Wyświetlenie wyników
    for (let i = 0; i < 12; i++) {
        console.log(`   interval = ${tu_destination[i].toFixed(5)} `);
    }

    printf("   -------------test_end\n");
}
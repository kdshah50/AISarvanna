export const COLONIAS: Record<string, { lat: number; lng: number; label: string }> = {
  centro:        { lat: 20.9146, lng: -100.7439, label: "Centro Histórico" },
  guadalupe:     { lat: 20.9168, lng: -100.7465, label: "Col. Guadalupe" },
  san_antonio:   { lat: 20.9120, lng: -100.7468, label: "San Antonio" },
  aurora:        { lat: 20.9188, lng: -100.7442, label: "Col. Aurora" },
  olimpo:        { lat: 20.9158, lng: -100.7420, label: "El Olimpo" },
  ojo_agua:      { lat: 20.9200, lng: -100.7480, label: "Ojo de Agua" },
  balcones:      { lat: 20.9080, lng: -100.7510, label: "Los Balcones" },
  lindavista:    { lat: 20.9050, lng: -100.7490, label: "Linda Vista" },
  insurgentes:   { lat: 20.9130, lng: -100.7500, label: "Insurgentes" },
  atascadero:    { lat: 20.9240, lng: -100.7430, label: "Atascadero" },
  la_lejona:     { lat: 20.8980, lng: -100.7450, label: "La Lejona" },
  fracc_paloma:  { lat: 20.9100, lng: -100.7420, label: "Fracc. La Paloma" },
  pedregal:      { lat: 20.9060, lng: -100.7470, label: "Pedregal" },
  guadiana:      { lat: 20.9170, lng: -100.7500, label: "Guadiana" },
  colinas_san_j: { lat: 20.9220, lng: -100.7510, label: "Col. San Javier" },
  la_canada:     { lat: 20.9000, lng: -100.7480, label: "La Cañada" },
};

export const COLONIA_KEYS = Object.keys(COLONIAS);

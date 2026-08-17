export const ALLERGENS = [
  { id: 'gluten', label: 'Gluten ve ürünleri', emoji: '🌾' },
  { id: 'crustacean', label: 'Kabuklu deniz ürünleri', emoji: '🦐' },
  { id: 'egg', label: 'Yumurta ve ürünleri', emoji: '🥚' },
  { id: 'fish', label: 'Balık ve ürünleri', emoji: '🐟' },
  { id: 'peanut', label: 'Yer fıstığı ve ürünleri', emoji: '🥜' },
  { id: 'soy', label: 'Soya ve ürünleri', emoji: '🫘' },
  { id: 'milk', label: 'Süt ve süt ürünleri (laktoz dahil)', emoji: '🥛' },
  { id: 'nuts', label: 'Kabuklu yemişler (fındık, badem, ceviz vb.)', emoji: '🌰' },
  { id: 'celery', label: 'Kereviz ve ürünleri', emoji: '🥬' },
  { id: 'mustard', label: 'Hardal ve ürünleri', emoji: '🟨' },
  { id: 'sesame', label: 'Susam ve ürünleri', emoji: '🌱' },
  { id: 'sulphites', label: 'Sülfür dioksit ve sülfitler', emoji: '🍷' },
  { id: 'lupin', label: 'Lüpin ve ürünleri', emoji: '🫛' },
  { id: 'molluscs', label: 'Yumuşakçalar (midye, salyangoz vb.)', emoji: '🐌' },
];

export function getAllergen(id) {
  return ALLERGENS.find((a) => a.id === id);
}

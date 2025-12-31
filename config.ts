
/**
 * Список ID пользователей Telegram, имеющих доступ к скрытым функциям.
 * Вы можете добавить сюда свой ID и ID своих помощников.
 */
export const ADMIN_IDS: number[] = [
  255119585, // Замените на ваш реальный Telegram ID
];

export const isUserAdmin = (id: number | undefined): boolean => {
  if (!id) return false;
  return ADMIN_IDS.includes(id);
};

export function useReaderIdentity() {
  const auth = useAuth();
  const guestIdCookie = useCookie<string>('omb-guest-id', {
    sameSite: 'lax',
    default: () => '',
  });
  const guestId = useState<string>('guest-reader-id', () => guestIdCookie.value || '');

  function ensureGuestId() {
    if (!guestId.value) {
      guestId.value = `guest_${Math.random().toString(36).slice(2, 10)}`;
      guestIdCookie.value = guestId.value;
    }

    return guestId.value;
  }

  const readerId = computed(() => auth.currentUser.value?.userId || guestId.value || ensureGuestId());
  const isAuthenticated = computed(() => Boolean(auth.currentUser.value?.userId && auth.token.value));

  return {
    readerId,
    guestId,
    isAuthenticated,
    ensureGuestId,
  };
}

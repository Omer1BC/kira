export const time = (): string =>
	new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

export const newId = (): string =>
	crypto.randomUUID();

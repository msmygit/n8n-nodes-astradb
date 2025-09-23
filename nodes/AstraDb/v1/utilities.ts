
/**
 * Generate paired item data for tracking input/output relationships
 * Following n8n item linking guidelines
 */
export function generatePairedItemData(length: number, inputIndex: number = 0): Array<{ item: number; input: number }> {
	return Array.from({ length }, (_, index) => ({ item: index, input: inputIndex }));
}

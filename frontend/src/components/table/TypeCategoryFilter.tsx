// import { SelectFilter } from '@/components/ui/SelectFilter';
// import { categoryService } from '@/services/category';

// export const TypeCategoryFilter = ({
//     selectedId,
//     onChange,
// }: {
//     selectedId: number | null;
//     onChange: (id: number | null) => void;
// }) => {
//     const fetchOptions = async () => {
//         try {
//             const res = await categoryService.getCategories({
//                 type: categoryType,
//                 page_size: 100,
//             });
//             return {
//                 options: [
//                     { id: 1, label: 'Productos' },
//                     { id: 2, label: 'Servicios' },
//                 ],
//             };
//         } catch (error) {
//             return { options: [], error: 'Error al cargar las categorías' };
//         }
//     };
//     return <SelectFilter fetchOptions={fetchOptions} selectedId={selectedId} onChange={onChange} />;
// };

export interface Material{
  id: string,
  title: string,
  description: string,
  items: ItemMaterial[]
  
  }
  
  export interface ItemMaterial{
  name: string,
  completed: boolean
  
  }
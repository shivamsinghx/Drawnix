export type Board = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export type SharedBoard = Board & {
  sharedBy: string
}

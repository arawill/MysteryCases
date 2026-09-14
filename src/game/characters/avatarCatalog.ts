import avatar1 from '../../assets/avatar/individuals/avatar_01.png'
import avatar2 from '../../assets/avatar/individuals/avatar_02.png'
import avatar3 from '../../assets/avatar/individuals/avatar_03.png'
import avatar4 from '../../assets/avatar/individuals/avatar_04.png'
import avatar5 from '../../assets/avatar/individuals/avatar_05.png'
import avatar6 from '../../assets/avatar/individuals/avatar_06.png'
import avatar7 from '../../assets/avatar/individuals/avatar_07.png'
import avatar8 from '../../assets/avatar/individuals/avatar_08.png'
import avatar9 from '../../assets/avatar/individuals/avatar_09.png'
import avatar10 from '../../assets/avatar/individuals/avatar_10.png'
import avatar11 from '../../assets/avatar/individuals/avatar_11.png'
import avatar12 from '../../assets/avatar/individuals/avatar_12.png'
import avatar13 from '../../assets/avatar/individuals/avatar_13.png'
import avatar14 from '../../assets/avatar/individuals/avatar_14.png'
import avatar15 from '../../assets/avatar/individuals/avatar_15.png'
import avatar16 from '../../assets/avatar/individuals/avatar_16.png'
import avatar17 from '../../assets/avatar/individuals/avatar_17.png'
import avatar18 from '../../assets/avatar/individuals/avatar_18.png'
import avatar19 from '../../assets/avatar/individuals/avatar_19.png'
import avatar20 from '../../assets/avatar/individuals/avatar_20.png'
import avatar21 from '../../assets/avatar/individuals/avatar_21.png'
import avatar22 from '../../assets/avatar/individuals/avatar_22.png'
import avatar23 from '../../assets/avatar/individuals/avatar_23.png'
import avatar24 from '../../assets/avatar/individuals/avatar_24.png'

export interface AvatarCatalogEntry {
  id: string
  image: string
  gender: 'female' | 'male'
}

/** Visual identity only: no names, roles, victims or permanent assignments. */
export const avatarCatalog: readonly AvatarCatalogEntry[] = [
  { id: 'avatar_01', image: avatar1, gender: 'female' },
  { id: 'avatar_02', image: avatar2, gender: 'male' },
  { id: 'avatar_03', image: avatar3, gender: 'female' },
  { id: 'avatar_04', image: avatar4, gender: 'male' },
  { id: 'avatar_05', image: avatar5, gender: 'female' },
  { id: 'avatar_06', image: avatar6, gender: 'male' },
  { id: 'avatar_07', image: avatar7, gender: 'female' },
  { id: 'avatar_08', image: avatar8, gender: 'male' },
  { id: 'avatar_09', image: avatar9, gender: 'female' },
  { id: 'avatar_10', image: avatar10, gender: 'male' },
  { id: 'avatar_11', image: avatar11, gender: 'female' },
  { id: 'avatar_12', image: avatar12, gender: 'male' },
  { id: 'avatar_13', image: avatar13, gender: 'female' },
  { id: 'avatar_14', image: avatar14, gender: 'male' },
  { id: 'avatar_15', image: avatar15, gender: 'female' },
  { id: 'avatar_16', image: avatar16, gender: 'male' },
  { id: 'avatar_17', image: avatar17, gender: 'female' },
  { id: 'avatar_18', image: avatar18, gender: 'male' },
  { id: 'avatar_19', image: avatar19, gender: 'female' },
  { id: 'avatar_20', image: avatar20, gender: 'male' },
  { id: 'avatar_21', image: avatar21, gender: 'female' },
  { id: 'avatar_22', image: avatar22, gender: 'male' },
  { id: 'avatar_23', image: avatar23, gender: 'female' },
  { id: 'avatar_24', image: avatar24, gender: 'male' },
]

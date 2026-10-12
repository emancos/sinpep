import axios from 'axios';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Room {
  id: string;
  name: string;
  number: string;
  sector?: string | null;
  floor?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isOccupied?: boolean;
  currentAllocation?: RoomAllocation | null;
}

export interface RoomAllocation {
  id: string;
  roomId: string;
  specialtyName: string;
  date: string;
  allocatedBy?: string | null;
  createdAt: string;
  updatedAt: string;
  room?: Room;
}

export const getRooms = async (
  params?: { search?: string; date?: string; activeOnly?: boolean },
  token?: string
): Promise<Room[]> => {
  const response = await axios.get(`${apiUrl}/rooms`, {
    params: {
      ...params,
      activeOnly: params?.activeOnly ? 'true' : undefined,
    },
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return response.data;
};

export const getRoom = async (id: string, token: string): Promise<Room> => {
  const response = await axios.get(`${apiUrl}/rooms/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const createRoom = async (
  data: { name: string; number: string; sector?: string | null; floor?: string | null; isActive?: boolean },
  token: string
): Promise<Room> => {
  const response = await axios.post(`${apiUrl}/rooms`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const updateRoom = async (
  id: string,
  data: Partial<{ name: string; number: string; sector?: string | null; floor?: string | null; isActive?: boolean }>,
  token: string
): Promise<Room> => {
  const response = await axios.patch(`${apiUrl}/rooms/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const toggleRoomActive = async (id: string, token: string): Promise<Room> => {
  const response = await axios.patch(`${apiUrl}/rooms/${id}/toggle-active`, {}, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deleteRoom = async (id: string, token: string): Promise<Room> => {
  const response = await axios.delete(`${apiUrl}/rooms/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getRoomAllocations = async (date: string, token: string): Promise<RoomAllocation[]> => {
  const response = await axios.get(`${apiUrl}/rooms/allocations`, {
    params: { date },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const getSpecialtyRoomAllocation = async (
  specialtyName: string,
  date: string,
  token: string
): Promise<RoomAllocation | null> => {
  const response = await axios.get(`${apiUrl}/rooms/allocation-for-specialty`, {
    params: { specialtyName, date },
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const allocateRoom = async (
  payload: { roomId: string; specialtyName: string; date: string },
  token: string
): Promise<RoomAllocation> => {
  const response = await axios.post(`${apiUrl}/rooms/allocate`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const deallocateRoom = async (
  payload: { specialtyName: string; date: string },
  token: string
): Promise<{ success: boolean; message: string }> => {
  const response = await axios.post(`${apiUrl}/rooms/deallocate`, payload, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
};

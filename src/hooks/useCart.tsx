import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { Product } from "../interfaces";
import { api } from "../services/api";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    return storagedCart ? JSON.parse(storagedCart) : [];
  });

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const productExists = updatedCart.find(
        (product) => product.id === productId
      );

      const stock = await api
        .get(`/stock/${productId}`)
        .then((response) => response.data);

      const stockAmount = stock.amount;

      const currentAmount = productExists ? productExists.amount : 0;

      const amount = currentAmount + 1;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productExists) productExists.amount = amount;
      else {
        const product = await api
          .get(`/products/${productId}`)
          .then((response) => response.data);

        const newProduct = {
          ...product,
          amount: 1,
        };

        updatedCart.push(newProduct);
      }

      setCart(updatedCart);

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productById = cart.find((product) => product.id === productId);

      if (!productById) {
        toast.error("Erro na remoção do produto");
        return;
      }

      const removeProductById = cart.filter(
        (product) => product.id !== productId
      );

      setCart(removeProductById);
      localStorage.setItem(
        "@RocketShoes:cart",
        JSON.stringify(removeProductById)
      );
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get(`/stock/${productId}`);

      const stockAmount = stock.data.amount;

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = [...cart];

      const productExists = updatedCart.find(
        (product) => product.id === productId
      );

      if (!productExists) throw Error();

      productExists.amount = amount;
      setCart(updatedCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}

package services

import (
	"SahabatMart/backend/models"
	"SahabatMart/backend/utils"
	"errors"
	"fmt"
	"gorm.io/gorm"
)

type BuyerService struct {
	DB *gorm.DB
}

func NewBuyerService(db *gorm.DB) *BuyerService {
	return &BuyerService{DB: db}
}

// AddToCart adds a product variant to user's cart with optional metadata attributes
func (s *BuyerService) AddToCart(buyerID string, productID string, variantID string, merchantID string, quantity int, metadata string) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Validate Product
		var product models.Product
		if err := tx.First(&product, "id = ?", productID).Error; err != nil {
			return errors.New("produk tidak ditemukan")
		}

		// 2. Validate Variant
		var variant models.ProductVariant
		err := tx.First(&variant, "id = ?", variantID).Error
		if err != nil {
			// Fallback to first variant if specific one not found
			if err := tx.Where("product_id = ?", productID).First(&variant).Error; err != nil {
				return errors.New("varian produk tidak tersedia")
			}
			variantID = variant.ID
		}

		// 3. [Akuglow Refactor] Check Stock from Inventory instead of Product model
		var inventory models.Inventory
		fmt.Printf("[DEBUG] AddToCart: Checking stock for Merchant: %s, Product: %s\n", merchantID, productID)
		if err := tx.Where("merchant_id = ? AND product_id = ?", merchantID, productID).First(&inventory).Error; err != nil {
			fmt.Printf("[ERROR] AddToCart: Stock NOT FOUND for Merchant: %s, Product: %s\n", merchantID, productID)
			return errors.New("produk tidak tersedia di merchant ini")
		}

		if inventory.Stock < quantity {
			return errors.New("stok di merchant ini tidak mencukupi")
		}

		// 4. Get or Create Cart
		var cart models.Cart
		tx.Where("buyer_id = ?", buyerID).First(&cart)
		if cart.ID == "" {
			cart = models.Cart{BuyerID: buyerID}
			if err := tx.Create(&cart).Error; err != nil {
				return err
			}
		}

		// 5. Update or Add Item (Normalize metadata to prevent duplicates from different sources)
		if metadata == "{}" {
			metadata = ""
		}

		var item models.CartItem
		// We include MerchantID in the search to allow buying same product from different merchants if needed
		result := tx.Where("cart_id = ? AND product_variant_id = ? AND merchant_id = ? AND metadata = ?", cart.ID, variantID, merchantID, metadata).First(&item)
		
		if result.Error == nil {
			// Update quantity if exists
			item.Quantity += quantity
			if item.Quantity <= 0 {
				err := tx.Delete(&item).Error
				if err == nil {
					utils.Hub.Broadcast(buyerID, map[string]interface{}{"type": "cart_update", "trigger": "item_removed"})
				}
				return err
			}
			if item.Quantity > inventory.Stock {
				return errors.New("total pesanan melebihi stok merchant yang tersedia")
			}
			err := tx.Save(&item).Error
			if err == nil {
				utils.Hub.Broadcast(buyerID, map[string]interface{}{"type": "cart_update", "trigger": "quantity_changed"})
			}
			return err
		}

		// Create new item (only if quantity > 0)
		if quantity <= 0 {
			return nil
		}
		
		newItem := models.CartItem{
			CartID:           cart.ID,
			MerchantID:       merchantID,
			ProductID:        productID,
			ProductVariantID: variantID,
			Quantity:         quantity,
			Metadata:         metadata,
		}
		err = tx.Create(&newItem).Error
		if err == nil {
			utils.Hub.Broadcast(buyerID, map[string]interface{}{
				"type":    "cart_update",
				"trigger": "item_added",
			})
		}
		return err
	})
}

// MoveFromWishlistToCart moves an item from wishlist to cart atomically
func (s *BuyerService) MoveFromWishlistToCart(buyerID string, productID string, variantID string, quantity int) error {
	return s.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Resolve a Merchant ID (Fallback to pusat if not specified/found)
		var inv models.Inventory
		merchantID := models.PusatID
		if err := tx.Where("product_id = ?", productID).First(&inv).Error; err == nil {
			merchantID = inv.MerchantID
		}

		// 2. Add to cart
		if err := s.AddToCart(buyerID, productID, variantID, merchantID, quantity, ""); err != nil {
			return err
		}

		// 2. Remove from wishlist
		return tx.Where("buyer_id = ? AND product_id = ?", buyerID, productID).Delete(&models.Wishlist{}).Error
	})
}

// ToggleWishlist adds or removes a product from wishlist
func (s *BuyerService) ToggleWishlist(buyerID string, productID string) (bool, error) {
	var exist models.Wishlist
	err := s.DB.Where("buyer_id = ? AND product_id = ?", buyerID, productID).First(&exist).Error
	
	if err == nil {
		// Already exists, remove it
		err = s.DB.Delete(&exist).Error
		return false, err
	}

	if err != gorm.ErrRecordNotFound {
		return false, err
	}

	// Not exists, add it
	newWish := models.Wishlist{
		BuyerID:   buyerID,
		ProductID: productID,
	}
	err = s.DB.Create(&newWish).Error
	if err == nil {
		utils.Hub.Broadcast(buyerID, map[string]interface{}{
			"type":    "wishlist_update",
			"trigger": "item_added",
		})
	}
	return true, err
}

// SyncWishlistStatus returns product list with "is_wishlisted" flag for a buyer
// Used for high-performance frontend sync
func (s *BuyerService) GetWishlistProducts(buyerID string) ([]models.Product, error) {
	var products []models.Product
	err := s.DB.Table("products").
		Joins("INNER JOIN wishlists ON wishlists.product_id = products.id").
		Where("wishlists.buyer_id = ?", buyerID).
		Find(&products).Error
	return products, err
}

func (s *BuyerService) ClearCart(buyerID string) error {
	fmt.Printf("[DEBUG] ClearCart: Attempting to clear cart for buyer %s\n", buyerID)
	return s.DB.Transaction(func(tx *gorm.DB) error {
		var cart models.Cart
		if err := tx.Where("buyer_id = ?", buyerID).First(&cart).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				fmt.Printf("[DEBUG] ClearCart: No cart found for buyer %s, nothing to clear\n", buyerID)
				return nil // Already clear
			}
			return err
		}
		// Explicitly delete items belonging to this cart
		result := tx.Where("cart_id = ?", cart.ID).Delete(&models.CartItem{})
		if result.Error != nil {
			fmt.Printf("[ERROR] ClearCart: Failed to delete cart items for cart %s: %v\n", cart.ID, result.Error)
			return result.Error
		}
		
		fmt.Printf("[DEBUG] ClearCart: Deleted %d items from cart %s for buyer %s\n", result.RowsAffected, cart.ID, buyerID)
		
		// Optional: We could delete the cart record too, but keeping it empty is usually fine
		
		utils.Hub.Broadcast(buyerID, map[string]interface{}{"type": "cart_update", "trigger": "cart_cleared"})
		return nil
	})
}

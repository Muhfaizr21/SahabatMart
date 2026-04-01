package main

import (
	"fmt"
	"net/http"
)

func main() {
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "SahabatMart API is running")
	})

	fmt.Println("Backend server starting on :8080...")
	http.ListenAndServe(":8080", nil)
}

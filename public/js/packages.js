document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("packagesContainer");

  try {
    const packages = await (await fetch("data/packages.json")).json();
    container.innerHTML = "";

    packages.forEach(pkg => {
      const card = document.createElement("div");
      card.className = "package-card";
      card.innerHTML = `
        <h3>${pkg.name}</h3>
        <p>${pkg.description}</p>
        <p><strong>Preço total:</strong> €${pkg.price.toFixed(2)}</p>
        <button class="buyPackageBtn">Adicionar ao Carrinho</button>
      `;

      card.querySelector(".buyPackageBtn").addEventListener("click", () => {
        const loggedUser = JSON.parse(localStorage.getItem("loggedUser"));
        if (!loggedUser) {
          alert("Inicia sessão para comprar pacotes.");
          return;
        }

        const usernameKey = loggedUser.email || loggedUser.username || "guest";
        const cart = JSON.parse(localStorage.getItem("cartTickets")) || [];

        // Adiciona o pacote como UM item no carrinho
        cart.push({
          id: Date.now() + Math.random(),
          username: usernameKey,
          isPackage: true,               // 👈 indica que é pacote
          packageId: pkg.id,
          packageName: pkg.name,
          description: pkg.description,
          trips: pkg.trips,
          price: pkg.price,
        });

        localStorage.setItem("cartTickets", JSON.stringify(cart));
        alert(`Pacote "${pkg.name}" adicionado ao carrinho!`);
      });

      container.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    container.innerHTML = `<p>Erro ao carregar pacotes.</p>`;
  }
});

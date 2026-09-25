async function loadSharedSidebar() {

    const currentPage =
        window.location.pathname.split('/').pop() || 'index.html';

    const existingSidebar =
        document.querySelector('.nxl-navigation');

    const fallback = `
        <nav class="nxl-navigation">

            <div class="sidebar-brand">
                <a href="index.html">ClothStock</a>
                <span>Gestão de estoque</span>
            </div>

            <ul class="sidebar-menu">

                <li class="sidebar-caption">Visão geral</li>

                <li>
                    <a href="dashboard.html" data-page="dashboard.html">
                        <i data-feather="home"></i>
                        Dashboard
                    </a>
                </li>

                <li class="sidebar-caption">Cadastros</li>

                <li>
                    <a href="products.html" data-page="products.html">
                        <i data-feather="package"></i>
                        Produtos
                    </a>
                </li>

                <li>
                    <a href="categories.html" data-page="categories.html">
                        <i data-feather="grid"></i>
                        Categorias
                    </a>
                </li>

                <li>
                    <a href="brands.html" data-page="brands.html">
                        <i data-feather="tag"></i>
                        Marcas
                    </a>
                </li>

                <li>
                    <a href="suppliers.html" data-page="suppliers.html">
                        <i data-feather="truck"></i>
                        Fornecedores
                    </a>
                </li>

                <li class="sidebar-caption">Movimentações</li>

                <li>
                    <a href="inflows.html" data-page="inflows.html">
                        <i data-feather="arrow-down-circle"></i>
                        Entradas
                    </a>
                </li>

                <li>
                    <a href="outflows.html" data-page="outflows.html">
                        <i data-feather="arrow-up-circle"></i>
                        Saídas
                    </a>
                </li>

            </ul>

        </nav>
    `;

    try {

        const response = await fetch('sidebar.html');

        if (!response.ok) {
            throw new Error(
                'Não foi possível carregar a navegação.'
            );
        }

        const wrapper = document.createElement('div');

        wrapper.innerHTML = await response.text();

        const sidebar = wrapper.firstElementChild;

        if (!sidebar) {
            throw new Error(
                'sidebar.html não possui uma navegação válida.'
            );
        }

        const activeLink =
            sidebar.querySelector(
                `[data-page="${currentPage}"]`
            );

        if (activeLink) {
            activeLink.classList.add('active');
        }

        if (existingSidebar) {
            existingSidebar.replaceWith(sidebar);
        } else {
            document.body.prepend(sidebar);
        }

        if (window.feather) {
            window.feather.replace();
        }

    } catch (error) {

        console.error(
            'Erro ao carregar sidebar:',
            error
        );

        const wrapper = document.createElement('div');

        wrapper.innerHTML = fallback;

        const sidebar = wrapper.firstElementChild;

        const activeLink =
            sidebar.querySelector(
                `[data-page="${currentPage}"]`
            );

        if (activeLink) {
            activeLink.classList.add('active');
        }

        if (existingSidebar) {
            existingSidebar.replaceWith(sidebar);
        } else {
            document.body.prepend(sidebar);
        }

        if (window.feather) {
            window.feather.replace();
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    loadSharedSidebar();
});
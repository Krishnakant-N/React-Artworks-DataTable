import { useState, useEffect, useRef } from "react";
import { OverlayPanel } from "primereact/overlaypanel";
import { Button } from "primereact/button";
import { InputNumber, InputNumberValueChangeEvent } from "primereact/inputnumber";
import { Checkbox } from "primereact/checkbox";
import { Column } from "primereact/column";
import { DataTable } from "primereact/datatable";
import { ProgressSpinner } from "primereact/progressspinner";
import axios from "axios";
import { Artwork } from "./interface/Artwork.ts";
import Header from "./Header/Header.tsx";
import "primereact/resources/themes/vela-green/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

function App() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [checkedItems, setCheckedItems] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalRecords, setTotalRecords] = useState<number>(0);
  const [paginationState, setPaginationState] = useState({
    first: 0,
    rows: 12,
    page: 0,
  });
  const [rowsToSelect, setRowsToSelect] = useState<number | null>(null);
  const [isAllPageSelected, setIsAllPageSelected] = useState<boolean>(false);
  const op = useRef<OverlayPanel>(null);

  const loadArtworkData = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "https://api.artic.edu/api/v1/artworks",
        {
          params: {
            page: paginationState.page + 1,
            limit: paginationState.rows,
            fields:
              "id,title,place_of_origin,artist_display,inscriptions,date_start,date_end",
          },
        }
      );
  
      const fetchedArtworks: Artwork[] = response.data.data
        .filter((artwork: any) => artwork.id) // Ensure `id` exists
        .map((artwork: any) => ({
          id: artwork.id,
          title: artwork.title,
          place_of_origin: artwork.place_of_origin || "Unknown",
          artist_display: artwork.artist_display || "Unknown",
          inscriptions: artwork.inscriptions || null,
          date_start: artwork.date_start || null,
          date_end: artwork.date_end || null,
          checked: checkedItems.includes(artwork.id),
        }));
  
      setArtworks(fetchedArtworks);
      setTotalRecords(response.data.pagination.total);
  
      const allRowsOnPageSelected = fetchedArtworks.every(
        (artwork) => checkedItems.includes(artwork.id)
      );
      setIsAllPageSelected(allRowsOnPageSelected);
    } catch (error) {
      console.error("Error fetching artwork data:", error);
    } finally {
      setLoading(false);
    }
  };
  

  useEffect(() => {
    loadArtworkData();
  }, [paginationState]);

  const onPage = (event: any) => {
    setPaginationState({
      first: event.first,
      rows: event.rows,
      page: event.page || event.first / event.rows,
    });
  };

  const handleRowSelection = async () => {
    if (!rowsToSelect || rowsToSelect <= 0) return;
  
    let selectedIds: number[] = [...checkedItems];
    let rowsRemaining = rowsToSelect;
    let currentPage = 1; 
  
    while (rowsRemaining > 0) {
      const response = await axios.get(
        "https://api.artic.edu/api/v1/artworks",
        {
          params: {
            page: currentPage,
            limit: paginationState.rows, 
            fields: "id",
          },
        }
      );
  
      const rows = response.data.data;
      if (rows.length === 0) break; 
  
      const rowsToSelectOnPage = Math.min(rowsRemaining, rows.length);
      const newIds = rows.slice(0, rowsToSelectOnPage).map((a: any) => a.id);
  
      selectedIds = Array.from(new Set([...selectedIds, ...newIds])); 
      rowsRemaining -= rowsToSelectOnPage;
      currentPage++;
    }
  
    setCheckedItems(selectedIds); 
    updateCheckedState(selectedIds); 
  };
  

  const updateCheckedState = (selectedIds: number[]) => {
    const updatedArtworks = artworks.map((artwork) => ({
      ...artwork,
      checked: selectedIds.includes(artwork.id),
    }));
    setArtworks(updatedArtworks);
  };

  const onCheckboxChange = (artwork: Artwork) => {
    const updatedArtworks = artworks.map((a) =>
      a.id === artwork.id ? { ...a, checked: !a.checked } : a
    );

    const updatedSelectedIds = updatedArtworks
      .filter((a) => a.checked)
      .map((a) => a.id);

    setCheckedItems(updatedSelectedIds);
    setArtworks(updatedArtworks);
  };

  const onSelectAllChange = () => {
    const newIsAllPageSelected = !isAllPageSelected;

    const updatedArtworks = artworks.map((artwork) => ({
      ...artwork,
      checked: newIsAllPageSelected,
    }));

    if (newIsAllPageSelected) {
      const currentPageIds = updatedArtworks.map((a) => a.id);
      const updatedSelectedIds = new Set([...checkedItems, ...currentPageIds]);
      setCheckedItems(Array.from(updatedSelectedIds));
    } else {
      const currentPageIds = new Set(artworks.map((a) => a.id));
      const updatedSelectedIds = checkedItems.filter(
        (id) => !currentPageIds.has(id)
      );
      setCheckedItems(updatedSelectedIds);
    }

    setIsAllPageSelected(newIsAllPageSelected);
    setArtworks(updatedArtworks);
  };

  const checkboxTemplate = (rowData: Artwork) => (
    <Checkbox
      checked={rowData.checked || false}
      onChange={() => onCheckboxChange(rowData)}
    />
  );

  const handleValueChange = (e: InputNumberValueChangeEvent) => {
    setRowsToSelect(e.value ?? null); // Safely handle null and undefined
  };

  const selectRowsTemplate = () => (
    <div style={{ display: "flex", alignItems: "center", width: "18rem" }}>
      <InputNumber
        value={rowsToSelect}
        onValueChange={handleValueChange}
        placeholder="Enter rows to select"
        style={{ width: "150px" }}
      />
      <Button
        label="Select"
        onClick={handleRowSelection}
        className="p-button-sm"
        style={{ marginLeft: "4.5rem" }}
      />
    </div>
  );

  const selectAllTemplate = () => (
    <div>
      <Checkbox checked={isAllPageSelected} onChange={onSelectAllChange} />
      <Button
        icon="pi pi-chevron-down"
        onClick={(e) => op.current?.toggle(e)}
        className="p-button-text p-button-sm"
        style={{ marginLeft: "3px" }}
      />
      <OverlayPanel ref={op}>{selectRowsTemplate()}</OverlayPanel>
    </div>
  );

  return (
    <div>
      <Header/>

      {loading ? (
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <ProgressSpinner />
        </div>
      ) : (
        <DataTable
          value={artworks}
          dataKey="id"
          lazy
          paginator
          rows={paginationState.rows}
          totalRecords={totalRecords}
          first={paginationState.first}
          onPage={onPage}
          size="normal"
          stripedRows
          showGridlines
        >
          <Column
            header={selectAllTemplate()}
            body={checkboxTemplate}
            style={{ width: "6rem", marginRight: "20px" }}
          />
          <Column
            field="title"
            header="Title"
            headerStyle={{
              backgroundColor: "#605F5E",
              color: "#F0F3BD",
              fontWeight: "bold",
              fontSize: "1.2rem",
              textAlign: "center",
              width: "18rem",
            }}
          />
          <Column
            field="place_of_origin"
            header="Place of Origin"
            body={(rowData) =>
              rowData.place_of_origin
                ? rowData.place_of_origin
                : "not specified"
            }
            headerStyle={{
              backgroundColor: "#605F5E",
              color: "#F0F3BD",
              fontWeight: "bold",
              width: "10rem",
              fontSize: "1.2rem",
            }}
          />
          <Column
            field="artist_display"
            header="Artist Display"
            headerStyle={{
              backgroundColor: "#605F5E",
              color: "#F0F3BD",
              fontWeight: "bold",
              width: "24rem",
              fontSize: "1.2rem",
              textAlign: "justify",
            }}
          />
          <Column
            field="inscriptions"
            header="Inscriptions"
            body={(rowData) =>
              rowData.inscriptions ? rowData.inscriptions : "not defined"
            }
            headerStyle={{
              backgroundColor: "#605F5E",
              color: "#F0F3BD",
              fontWeight: "bold",
              width: "22rem",
              fontSize: "1.2rem",
              textAlign: "center",
            }}
          />
          <Column
            field="date_start"
            header="Date Start"
            headerStyle={{
              backgroundColor: "#605F5E",
              color: "#F0F3BD",
              fontWeight: "bold",
              width: "9rem",
              fontSize: "1.2rem",
            }}
          />
          <Column
            field="date_end"
            header="Date End"
            headerStyle={{
              backgroundColor: "#605F5E",
              color: "#F0F3BD",
              fontWeight: "bold",
              width: "8rem",
              fontSize: "1.2rem",
            }}
          />
        </DataTable>
      )}
    </div>
  );
}

export default App;